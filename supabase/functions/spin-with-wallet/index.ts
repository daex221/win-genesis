import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get spin cost based on tier (hardcoded for now)
async function getSpinCost(supabaseClient: any, tier: string): Promise<number> {
  // TODO: Create pricing_config table to store dynamic pricing
  const pricing: Record<string, number> = {
    basic: 2,
    gold: 5,
    vip: 10,
  };

  const cost = pricing[tier];
  if (!cost) {
    console.error("[SPIN-WITH-WALLET] Invalid tier for pricing:", tier);
    throw new Error("Invalid tier");
  }

  return cost;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[SPIN-WITH-WALLET] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      console.error("[SPIN-WITH-WALLET] Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const user = userData.user;

    const { tier } = await req.json();

    if (!tier || !["basic", "gold", "vip"].includes(tier)) {
      console.error("[SPIN-WITH-WALLET] Invalid tier:", tier);
      return new Response(
        JSON.stringify({ error: "Invalid tier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cost = await getSpinCost(supabaseClient, tier);
    console.log("[SPIN-WITH-WALLET] Spin requested for tier:", tier, "cost:", cost);

    // Get or create wallet
    let { data: wallet, error: walletError } = await supabaseClient
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) {
      console.error("[SPIN-WITH-WALLET] Error fetching wallet:", walletError);
      return new Response(
        JSON.stringify({ error: "Failed to access wallet" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!wallet) {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabaseClient
        .from("wallets")
        .insert({ user_id: user.id, balance: 0 })
        .select()
        .single();

      if (createError) {
        console.error("[SPIN-WITH-WALLET] Error creating wallet:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create wallet" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      wallet = newWallet;
    }

    // Check sufficient balance
    if (Number(wallet.balance) < cost) {
      console.log("[SPIN-WITH-WALLET] Insufficient balance:", {
        balance: Number(wallet.balance),
        required: cost,
        tier
      });
      return new Response(
        JSON.stringify({ 
          error: "Insufficient balance",
          balance: Number(wallet.balance),
          required: cost
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch active prize metadata (public data)
    const { data: prizeMetadata, error: metadataError } = await supabaseClient
      .from("prize_metadata")
      .select("*")
      .eq("active", true)
      .order("id");

    if (metadataError || !prizeMetadata || prizeMetadata.length === 0) {
      return new Response(
        JSON.stringify({ error: "No prizes available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Weighted random selection based on tier
    const weightKey = `weight_${tier}` as "weight_basic" | "weight_gold" | "weight_vip";
    const totalWeight = prizeMetadata.reduce((sum, p) => sum + (p[weightKey] || 0), 0);
    
    console.log("[SPIN-WITH-WALLET] Prize order:", prizeMetadata.map((p, i) => `${i}: ${p.name} (${p.id.substring(0, 8)})`));
    
    let random = Math.random() * totalWeight;
    let selectedPrize = prizeMetadata[0];

    for (const prize of prizeMetadata) {
      random -= prize[weightKey] || 0;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }
    
    const selectedIndex = prizeMetadata.findIndex(p => p.id === selectedPrize.id);
    console.log("[SPIN-WITH-WALLET] Selected prize:", selectedPrize.name, "at index:", selectedIndex);

    // Fetch delivery content for the selected prize (using service role)
    const { data: deliveryData, error: deliveryError } = await supabaseClient
      .from("prize_delivery")
      .select("is_tier_specific, delivery_content_basic, delivery_content_gold, delivery_content_vip, delivery_content_legacy")
      .eq("prize_id", selectedPrize.id)
      .single();

    if (deliveryError) {
      console.error("[SPIN-WITH-WALLET] Error fetching delivery content:", deliveryError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve prize details" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the appropriate content based on tier
    let deliveryContent: string;

    if (deliveryData.is_tier_specific) {
      // Use tier-specific content
      switch (tier) {
        case "basic":
          deliveryContent = deliveryData.delivery_content_basic;
          break;
        case "gold":
          deliveryContent = deliveryData.delivery_content_gold;
          break;
        case "vip":
          deliveryContent = deliveryData.delivery_content_vip;
          break;
        default:
          deliveryContent = deliveryData.delivery_content_basic;
      }
      console.log(`[SPIN-WITH-WALLET] Using tier-specific content for ${tier} tier`);
    } else {
      // Use shared content (backward compatibility)
      deliveryContent = deliveryData.delivery_content_basic || deliveryData.delivery_content_legacy;
      console.log("[SPIN-WITH-WALLET] Using shared content for all tiers");
    }

    // Deduct balance
    const newBalance = Number(wallet.balance) - cost;
    const { error: updateError } = await supabaseClient
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", wallet.id);

    if (updateError) {
      console.error("[SPIN-WITH-WALLET] Error updating wallet:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to deduct balance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record wallet transaction
    await supabaseClient
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        amount: -cost,
        type: "debit",
        description: `Spin - ${tier.toUpperCase()} tier`,
      });

    // Record the spin
    const { error: spinError } = await supabaseClient
      .from("spins")
      .insert({
        prize_id: selectedPrize.id,
        tier,
        token_hash: `wallet_${Date.now()}_${user.id}`,
        email: user.email!,
        amount_paid: cost,
      });

    if (spinError) {
      console.error("[SPIN-WITH-WALLET] Error recording spin:", spinError);
    }

    console.log("[SPIN-WITH-WALLET] Spin successful, new balance:", newBalance);

    // Send prize email via SendGrid
    try {
      const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-prize-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          email: user.email,
          prizeData: {
            name: selectedPrize.name,
            emoji: selectedPrize.emoji,
            delivery_content: deliveryContent,
            type: selectedPrize.type,
          },
          tier,
        }),
      });

      if (emailResponse.ok) {
        console.log("[SPIN-WITH-WALLET] Prize email sent to", user.email);
      } else {
        console.error("[SPIN-WITH-WALLET] Failed to send prize email:", await emailResponse.text());
      }
    } catch (emailError) {
      console.error("[SPIN-WITH-WALLET] Error sending prize email:", emailError);
      // Don't fail the spin if email fails
    }

    return new Response(
      JSON.stringify({
        prize: {
          id: selectedPrize.id,
          name: selectedPrize.name,
          emoji: selectedPrize.emoji,
          type: selectedPrize.type,
          delivery_content: deliveryContent,
        },
        newBalance: newBalance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SPIN-WITH-WALLET] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
