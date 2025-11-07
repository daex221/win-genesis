import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[VERIFY-PAYMENT] Function started");

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    console.log("[VERIFY-PAYMENT] Verifying session:", sessionId);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    console.log("[VERIFY-PAYMENT] Payment verified for session:", sessionId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if this is a wallet top-up
    if (session.metadata?.type === "wallet_topup") {
      const userId = session.metadata.user_id;
      const amount = parseFloat(session.metadata.amount || "0");
      const email = session.customer_details?.email || "";

      console.log("[VERIFY-PAYMENT] Processing wallet top-up for user:", userId);

      // Get or create wallet
      let { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError && walletError.code !== "PGRST116") {
        throw walletError;
      }

      if (!wallet) {
        const { data: newWallet, error: createError } = await supabase
          .from("wallets")
          .insert({ user_id: userId, balance: amount })
          .select()
          .single();

        if (createError) throw createError;
        wallet = newWallet;
      } else {
        // Update balance
        const newBalance = Number(wallet.balance) + amount;
        const { error: updateError } = await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("id", wallet.id);

        if (updateError) throw updateError;
      }

      // Record transaction
      await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: wallet.id,
          user_id: userId,
          amount: amount,
          type: "credit",
          description: `Wallet top-up via Stripe`,
          stripe_payment_id: sessionId,
        });

      console.log("[VERIFY-PAYMENT] Wallet top-up successful");

      return new Response(
        JSON.stringify({ 
          verified: true,
          type: "wallet_topup",
          amount
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Legacy tier purchase (for backwards compatibility)
      const token = `${sessionId}_${Date.now()}_${crypto.randomUUID()}`;
      const tier = session.metadata?.tier || "basic";
      const email = session.customer_details?.email || "";
      const amountPaid = session.amount_total ? session.amount_total / 100 : 0;

      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          stripe_session_id: sessionId,
          email: email,
          tier: tier,
          amount: amountPaid,
          status: "paid",
        });

      if (txError) {
        console.error("[VERIFY-PAYMENT] Error storing transaction:", txError);
      }

      return new Response(
        JSON.stringify({ 
          token,
          tier,
          email,
          verified: true 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error("[VERIFY-PAYMENT] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", verified: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
