import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SpinRequest {
  token: string;
  tier: string;
}

// Helper function to convert hex string to ArrayBuffer
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

// Verify HMAC-signed token
async function verifySecureToken(token: string, tier: string): Promise<{ valid: boolean; sessionId: string }> {
  const SECRET = Deno.env.get("HMAC_SECRET_KEY");
  if (!SECRET) {
    throw new Error("HMAC_SECRET_KEY not configured");
  }

  const parts = token.split(':');
  if (parts.length !== 4) {
    return { valid: false, sessionId: "" };
  }

  const [sessionId, tokenTier, timestamp, signature] = parts;

  // Verify tier matches
  if (tokenTier !== tier) {
    console.log("[SPIN-PRIZE] Tier mismatch");
    return { valid: false, sessionId: "" };
  }

  // Check expiration (10 minutes)
  const tokenAge = Date.now() - parseInt(timestamp);
  if (tokenAge > 600000) {
    console.log("[SPIN-PRIZE] Token expired");
    return { valid: false, sessionId: "" };
  }

  // Verify HMAC signature
  const payload = `${sessionId}:${tokenTier}:${timestamp}`;
  
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    hexToBuffer(signature),
    new TextEncoder().encode(payload)
  );

  if (!valid) {
    console.log("[SPIN-PRIZE] Invalid HMAC signature");
  }

  return { valid, sessionId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { token, tier }: SpinRequest = await req.json();

    if (!token || !tier) {
      return new Response(
        JSON.stringify({ error: "Missing token or tier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate tier
    if (!["basic", "gold", "vip"].includes(tier)) {
      return new Response(
        JSON.stringify({ error: "Invalid tier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SPIN-PRIZE] Verifying token signature");

    // Verify HMAC signature and expiration
    const { valid, sessionId } = await verifySecureToken(token, tier);
    
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SPIN-PRIZE] Token verified successfully");

    // Hash the full token for replay prevention
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Verify token hasn't been used
    const { data: existingSpin } = await supabaseClient
      .from("spins")
      .select("id")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (existingSpin) {
      console.log("[SPIN-PRIZE] Token already used");
      return new Response(
        JSON.stringify({ error: "Token already used" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment information from transactions table
    const { data: transaction, error: txError } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .eq("tier", tier)
      .eq("status", "paid")
      .maybeSingle();

    if (txError || !transaction) {
      console.error("[SPIN-PRIZE] No valid transaction found:", txError);
      return new Response(
        JSON.stringify({ error: "No valid payment found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SPIN-PRIZE] Valid transaction found for email:", transaction.email);

    // Get prizes already won by this user
    const { data: wonPrizes } = await supabaseClient
      .from("spins")
      .select("prize_id")
      .eq("email", transaction.email);

    const wonPrizeIds = new Set(wonPrizes?.map(s => s.prize_id) || []);
    console.log("[SPIN-PRIZE] User has won", wonPrizeIds.size, "prizes already");

    // Fetch active prize metadata only (public data)
    const { data: allPrizes, error: metadataError } = await supabaseClient
      .from("prize_metadata")
      .select("*")
      .eq("active", true);

    if (metadataError || !allPrizes || allPrizes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No prizes available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out already won prizes
    let prizeMetadata = allPrizes.filter(p => !wonPrizeIds.has(p.id));
    
    // If all prizes won, allow re-winning
    if (prizeMetadata.length === 0) {
      console.log("[SPIN-PRIZE] All prizes won, allowing re-win");
      prizeMetadata = allPrizes;
    }

    // Weighted random selection based on tier
    const weightKey = `weight_${tier}` as "weight_basic" | "weight_gold" | "weight_vip";
    const totalWeight = prizeMetadata.reduce((sum, p) => sum + (p[weightKey] || 0), 0);
    
    let random = Math.random() * totalWeight;
    let selectedPrize = prizeMetadata[0];

    for (const prize of prizeMetadata) {
      random -= prize[weightKey] || 0;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // Fetch delivery content for the selected prize (using service role)
    const { data: deliveryData, error: deliveryError } = await supabaseClient
      .from("prize_delivery")
      .select("delivery_content")
      .eq("prize_id", selectedPrize.id)
      .single();

    if (deliveryError) {
      console.error("[SPIN-PRIZE] Error fetching delivery content:", deliveryError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve prize details" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the spin (using service role, bypasses RLS)
    const { error: spinError } = await supabaseClient
      .from("spins")
      .insert({
        prize_id: selectedPrize.id,
        tier,
        token_hash: tokenHash,
        email: transaction.email,
        amount_paid: transaction.amount,
        stripe_payment_id: transaction.stripe_session_id,
      });

    if (spinError) {
      console.error("[SPIN-PRIZE] Error recording spin:", spinError);
      return new Response(
        JSON.stringify({ error: "Failed to record spin" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SPIN-PRIZE] Spin recorded successfully");

    // Return prize info INCLUDING delivery_content since payment is verified
    return new Response(
      JSON.stringify({
        id: selectedPrize.id,
        name: selectedPrize.name,
        emoji: selectedPrize.emoji,
        type: selectedPrize.type,
        delivery_content: deliveryData.delivery_content,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in spin-prize function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
