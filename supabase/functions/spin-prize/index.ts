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

    // Hash token for comparison (in production, use proper HMAC)
    const tokenHash = token;

    // Verify token hasn't been used
    const { data: existingSpin } = await supabaseClient
      .from("spins")
      .select("id")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (existingSpin) {
      return new Response(
        JSON.stringify({ error: "Token already used" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch active prizes with weights
    const { data: prizes, error: prizesError } = await supabaseClient
      .from("prizes")
      .select("*")
      .eq("active", true);

    if (prizesError || !prizes || prizes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No prizes available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Weighted random selection based on tier
    const weightKey = `weight_${tier}` as "weight_basic" | "weight_gold" | "weight_vip";
    const totalWeight = prizes.reduce((sum, p) => sum + (p[weightKey] || 0), 0);
    
    let random = Math.random() * totalWeight;
    let selectedPrize = prizes[0];

    for (const prize of prizes) {
      random -= prize[weightKey] || 0;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // Record the spin (using service role, bypasses RLS)
    const { error: spinError } = await supabaseClient
      .from("spins")
      .insert({
        prize_id: selectedPrize.id,
        tier,
        token_hash: tokenHash,
        email: "placeholder@example.com", // Replace with actual email from payment
        amount_paid: tier === "basic" ? 15 : tier === "gold" ? 30 : 50,
        stripe_payment_id: null,
      });

    if (spinError) {
      console.error("Error recording spin:", spinError);
      return new Response(
        JSON.stringify({ error: "Failed to record spin" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return prize info WITHOUT delivery_content to client
    return new Response(
      JSON.stringify({
        prize: {
          id: selectedPrize.id,
          name: selectedPrize.name,
          emoji: selectedPrize.emoji,
          type: selectedPrize.type,
        },
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
