import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPIN_COSTS = {
  basic: 15,
  gold: 30,
  vip: 50,
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

    const cost = SPIN_COSTS[tier as keyof typeof SPIN_COSTS];
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

    // Get prizes already won by this user
    const { data: wonPrizes } = await supabaseClient
      .from("spins")
      .select("prize_id")
      .eq("email", user.email!);

    const wonPrizeIds = new Set(wonPrizes?.map(s => s.prize_id) || []);
    console.log("[SPIN-WITH-WALLET] User has won", wonPrizeIds.size, "prizes already");

    // Fetch active prize metadata (public data)
    const { data: allPrizes, error: metadataError } = await supabaseClient
      .from("prize_metadata")
      .select("*")
      .eq("active", true)
      .order("id");

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
      console.log("[SPIN-WITH-WALLET] All prizes won, allowing re-win");
      prizeMetadata = allPrizes;
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
      .select("delivery_content")
      .eq("prize_id", selectedPrize.id)
      .single();

    if (deliveryError) {
      console.error("[SPIN-WITH-WALLET] Error fetching delivery content:", deliveryError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve prize details" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    const { data: spinRecord, error: spinError } = await supabaseClient
      .from("spins")
      .insert({
        prize_id: selectedPrize.id,
        tier,
        token_hash: `wallet_${Date.now()}_${user.id}`,
        email: user.email!,
        amount_paid: cost,
      })
      .select()
      .single();

    if (spinError || !spinRecord) {
      console.error("[SPIN-WITH-WALLET] Error recording spin:", spinError);
      return new Response(
        JSON.stringify({ error: "Failed to record spin" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle prize delivery based on fulfillment type
    console.log("[SPIN-WITH-WALLET] Prize fulfillment type:", selectedPrize.fulfillment_type);
    
    try {
      if (selectedPrize.fulfillment_type === "manual") {
        // Send manual prize notification
        console.log("[SPIN-WITH-WALLET] Sending manual prize notification");
        await supabaseClient.functions.invoke("notify-manual-prize", {
          body: {
            email: user.email!,
            userName: user.email!.split("@")[0],
            prizeName: selectedPrize.name,
            prizeEmoji: selectedPrize.emoji,
            prizeId: selectedPrize.id,
            spinId: spinRecord.id,
            transactionId: `TX-${spinRecord.id.substring(0, 8)}`,
            wonAt: new Date().toISOString(),
            tier,
            amountPaid: cost,
            fulfillmentInstructions: deliveryData.delivery_content,
          },
        });
      } else {
        // Send automatic prize email
        console.log("[SPIN-WITH-WALLET] Sending automatic prize email");
        await supabaseClient.functions.invoke("send-prize-email", {
          body: {
            email: user.email!,
            userName: user.email!.split("@")[0],
            prizeName: selectedPrize.name,
            prizeEmoji: selectedPrize.emoji,
            prizeLink: deliveryData.delivery_content,
            transactionId: `TX-${spinRecord.id.substring(0, 8)}`,
            spinId: spinRecord.id,
          },
        });
      }
    } catch (deliveryError) {
      console.error("[SPIN-WITH-WALLET] Prize delivery error (non-blocking):", deliveryError);
      // Don't block the spin result even if email fails
    }

    console.log("[SPIN-WITH-WALLET] Spin successful, new balance:", newBalance);

    return new Response(
      JSON.stringify({
        prize: {
          id: selectedPrize.id,
          name: selectedPrize.name,
          emoji: selectedPrize.emoji,
          type: selectedPrize.type,
          delivery_content: deliveryData.delivery_content,
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
