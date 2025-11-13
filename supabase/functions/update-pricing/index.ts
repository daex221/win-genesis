import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("app_role")
      .eq("user_id", userData.user.id)
      .eq("app_role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tier, price, stripe_price_id, reason } = await req.json();

    // Validate input
    if (!tier || !["basic", "gold", "vip"].includes(tier)) {
      return new Response(
        JSON.stringify({ error: "Invalid tier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!price || price <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid price" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!stripe_price_id) {
      return new Response(
        JSON.stringify({ error: "Missing Stripe price ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update pricing (this will trigger the history logging via database trigger)
    const { data: updatedPricing, error: updateError } = await supabaseClient
      .from("pricing_config")
      .update({
        price: price,
        stripe_price_id: stripe_price_id,
      })
      .eq("tier", tier)
      .select()
      .single();

    if (updateError) {
      console.error("[UPDATE-PRICING] Error updating pricing:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update pricing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If reason provided, update the history entry
    if (reason) {
      const { error: historyError } = await supabaseClient
        .from("pricing_history")
        .update({ reason: reason })
        .eq("tier", tier)
        .order("created_at", { ascending: false })
        .limit(1);

      if (historyError) {
        console.error("[UPDATE-PRICING] Error updating history reason:", historyError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pricing: {
          tier: updatedPricing.tier,
          price: Number(updatedPricing.price),
          stripe_price_id: updatedPricing.stripe_price_id,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[UPDATE-PRICING] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
