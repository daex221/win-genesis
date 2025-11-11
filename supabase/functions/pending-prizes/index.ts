import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify admin role
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("app_role")
      .eq("user_id", user.id)
      .eq("app_role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Admin access required");
    }

    console.log("Fetching pending manual prizes");

    // Get all pending manual prize spins with prize details
    const { data: pendingSpins, error: spinsError } = await supabase
      .from("spins")
      .select(`
        id,
        email,
        created_at,
        tier,
        amount_paid,
        prize_id,
        fulfillment_status
      `)
      .eq("fulfillment_status", "pending")
      .order("created_at", { ascending: true });

    if (spinsError) {
      throw spinsError;
    }

    // Get prize details for all pending spins
    const prizeIds = [...new Set(pendingSpins?.map((s) => s.prize_id) || [])];
    const { data: prizes, error: prizesError } = await supabase
      .from("prize_metadata")
      .select("id, name, emoji, fulfillment_type")
      .in("id", prizeIds)
      .eq("fulfillment_type", "manual");

    if (prizesError) {
      throw prizesError;
    }

    // Get delivery content (fulfillment instructions) for prizes
    const { data: deliveryContent, error: deliveryError } = await supabase
      .from("prize_delivery")
      .select("prize_id, delivery_content")
      .in("prize_id", prizeIds);

    if (deliveryError) {
      console.error("Error fetching delivery content:", deliveryError);
    }

    // Create a map for quick lookup
    const prizeMap = new Map(prizes?.map((p) => [p.id, p]) || []);
    const deliveryMap = new Map(
      deliveryContent?.map((d) => [d.prize_id, d.delivery_content]) || []
    );

    // Combine spin and prize data
    const pendingPrizes = pendingSpins
      ?.filter((spin) => {
        const prize = prizeMap.get(spin.prize_id);
        return prize && prize.fulfillment_type === "manual";
      })
      .map((spin) => {
        const prize = prizeMap.get(spin.prize_id);
        const instructions = deliveryMap.get(spin.prize_id);
        const timeElapsed = Date.now() - new Date(spin.created_at).getTime();
        const hoursAgo = Math.floor(timeElapsed / (1000 * 60 * 60));
        const minutesAgo = Math.floor((timeElapsed % (1000 * 60 * 60)) / (1000 * 60));

        return {
          spinId: spin.id,
          userEmail: spin.email,
          prizeName: prize?.name || "Unknown",
          prizeEmoji: prize?.emoji || "🎁",
          tier: spin.tier,
          amountPaid: spin.amount_paid,
          wonAt: spin.created_at,
          timeElapsed: hoursAgo > 0 ? `${hoursAgo}h ago` : `${minutesAgo}m ago`,
          fulfillmentInstructions: instructions || "No instructions provided",
          transactionId: `TX-${spin.id.substring(0, 8)}`,
        };
      }) || [];

    console.log(`Found ${pendingPrizes.length} pending manual prizes`);

    return new Response(
      JSON.stringify({
        success: true,
        count: pendingPrizes.length,
        prizes: pendingPrizes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in pending-prizes:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});