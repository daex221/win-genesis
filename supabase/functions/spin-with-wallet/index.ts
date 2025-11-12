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

// Prize names that trigger special actions
const DISCOUNT_PRIZE_NAME = "20% Off";
const SHOUTOUT_PRIZE_NAME = "Custom Shout-Out";

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

    let cost = SPIN_COSTS[tier as keyof typeof SPIN_COSTS];
    
    // FEATURE 1: Check for active voucher
    const { data: activeVoucher } = await supabaseClient
      .from("vouchers")
      .select("*")
      .eq("user_id", user.id)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    let voucherApplied = false;
    let originalCost = cost;

    if (activeVoucher) {
      const discount = activeVoucher.discount_percent / 100;
      cost = Math.round(cost * (1 - discount));
      voucherApplied = true;
      console.log("[SPIN-WITH-WALLET] Voucher applied:", activeVoucher.discount_percent, "% off. Original:", originalCost, "New:", cost);
    }

    console.log("[SPIN-WITH-WALLET] Spin requested for tier:", tier, "cost:", cost, "voucher:", voucherApplied ? "YES" : "NO");

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

    // FEATURE 5: Get content pool with rotation (avoid repeats)
    const { data: contentPool, error: contentError } = await supabaseClient
      .from("prize_content_pool")
      .select("*")
      .eq("prize_id", selectedPrize.id)
      .eq("is_active", true);

    // Get user's prize history to avoid duplicates
    const { data: userHistory } = await supabaseClient
      .from("user_prize_history")
      .select("content_id")
      .eq("user_id", user.id)
      .eq("prize_id", selectedPrize.id);

    const usedContentIds = new Set(userHistory?.map(h => h.content_id).filter(Boolean) || []);

    // Pick random content from pool or fall back to prize_delivery
    let prizeContent = "";
    let contentName = "Prize Content";
    let selectedContentId: string | null = null;

    if (contentPool && contentPool.length > 0) {
      // Filter out already received content
      let availableContent = contentPool.filter(c => !usedContentIds.has(c.id));
      
      // If all exhausted, start fresh rotation
      if (availableContent.length === 0) {
        console.log("[SPIN-WITH-WALLET] All content exhausted, starting fresh rotation");
        availableContent = contentPool;
      }

      const randomContent = availableContent[Math.floor(Math.random() * availableContent.length)];
      prizeContent = randomContent.content_url;
      contentName = randomContent.content_name || "Prize Content";
      selectedContentId = randomContent.id;
      console.log("[SPIN-WITH-WALLET] Selected content from pool:", contentName, "Used before:", usedContentIds.has(randomContent.id));
    } else {
      // Fall back to prize_delivery table
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
      prizeContent = deliveryData.delivery_content;
      console.log("[SPIN-WITH-WALLET] Using fallback delivery content");
    }

    // Mark voucher as used if one was applied
    if (voucherApplied && activeVoucher) {
      await supabaseClient
        .from("vouchers")
        .update({ 
          used: true, 
          used_at: new Date().toISOString() 
        })
        .eq("id", activeVoucher.id);
      console.log("[SPIN-WITH-WALLET] Voucher marked as used:", activeVoucher.id);
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
    const transactionDesc = voucherApplied 
      ? `Spin - ${tier.toUpperCase()} tier (${activeVoucher.discount_percent}% off applied)`
      : `Spin - ${tier.toUpperCase()} tier`;
    
    await supabaseClient
      .from("wallet_transactions")
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        amount: -cost,
        type: "debit",
        description: transactionDesc,
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
        fulfillment_status: "pending",
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

    // FEATURE 5: Record prize history for content rotation
    if (selectedContentId) {
      await supabaseClient
        .from("user_prize_history")
        .insert({
          user_id: user.id,
          prize_id: selectedPrize.id,
          content_id: selectedContentId,
          content_url: prizeContent,
        });
    }

    // FEATURE 1: Create voucher if won "20% Off" prize
    if (selectedPrize.name === DISCOUNT_PRIZE_NAME) {
      console.log("[SPIN-WITH-WALLET] Creating 20% discount voucher");
      await supabaseClient
        .from("vouchers")
        .insert({
          user_id: user.id,
          discount_percent: 20,
          tier: null, // Works on any tier
          used: false,
        });
    }

    // FEATURE 3: Create shout-out request if won custom shout-out
    if (selectedPrize.name === SHOUTOUT_PRIZE_NAME) {
      console.log("[SPIN-WITH-WALLET] Creating shout-out request");
      await supabaseClient
        .from("shout_out_requests")
        .insert({
          user_id: user.id,
          user_email: user.email!,
          spin_id: spinRecord.id,
          message: prizeContent || "Please record my custom shout-out!",
          status: "pending",
        });
    }

    // Handle prize delivery based on fulfillment type
    console.log("[SPIN-WITH-WALLET] Prize fulfillment type:", selectedPrize.fulfillment_type);
    
    let fulfillmentSuccess = false;

    try {
      if (selectedPrize.fulfillment_type === "manual") {
        // FEATURE 6: Create admin notification (replace N8N)
        console.log("[SPIN-WITH-WALLET] Creating admin notification for manual prize");
        await supabaseClient
          .from("admin_notifications")
          .insert({
            type: "manual_prize",
            title: `Manual Prize: ${selectedPrize.name}`,
            message: `User ${user.email} won "${selectedPrize.name}" - requires manual fulfillment`,
            spin_id: spinRecord.id,
            user_email: user.email!,
            status: "pending",
          });
        
        fulfillmentSuccess = true;
      } else {
        // Send automatic prize email
        console.log("[SPIN-WITH-WALLET] Sending automatic prize email");
        const emailResult = await supabaseClient.functions.invoke("send-prize-email", {
          body: {
            email: user.email!,
            userName: user.email!.split("@")[0],
            prizeName: selectedPrize.name,
            prizeEmoji: selectedPrize.emoji,
            prizeLink: prizeContent,
            transactionId: `TX-${spinRecord.id.substring(0, 8)}`,
            spinId: spinRecord.id,
          },
        });
        
        if (!emailResult.error) {
          fulfillmentSuccess = true;
        }
      }
    } catch (deliveryError) {
      console.error("[SPIN-WITH-WALLET] Prize delivery error (non-blocking):", deliveryError);
      // Don't block the spin result even if email fails
    }

    // FEATURE 4: Update fulfillment status if delivery was successful
    if (fulfillmentSuccess) {
      await supabaseClient
        .from("spins")
        .update({ 
          fulfillment_status: selectedPrize.fulfillment_type === "manual" ? "pending" : "completed",
          fulfilled_at: selectedPrize.fulfillment_type === "automatic" ? new Date().toISOString() : null,
        })
        .eq("id", spinRecord.id);
      console.log("[SPIN-WITH-WALLET] Fulfillment status updated");
    }

    console.log("[SPIN-WITH-WALLET] Spin successful, new balance:", newBalance);

    return new Response(
      JSON.stringify({
        prize: {
          id: selectedPrize.id,
          name: selectedPrize.name,
          emoji: selectedPrize.emoji,
          type: selectedPrize.type,
          delivery_content: prizeContent,
          content_name: contentName,
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
