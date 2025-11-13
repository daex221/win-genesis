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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Fetch active pricing from database
    const { data: pricing, error } = await supabaseClient
      .from("pricing_config")
      .select("tier, price, stripe_price_id")
      .eq("active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error("[GET-PRICING] Error fetching pricing:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch pricing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform to object for easier access
    const pricingMap = pricing.reduce((acc, item) => {
      acc[item.tier] = {
        price: Number(item.price),
        stripe_price_id: item.stripe_price_id,
      };
      return acc;
    }, {} as Record<string, { price: number; stripe_price_id: string }>);

    return new Response(
      JSON.stringify({ pricing: pricingMap }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[GET-PRICING] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
