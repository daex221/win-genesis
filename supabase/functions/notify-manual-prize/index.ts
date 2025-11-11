import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyManualPrizeRequest {
  email: string;
  userName: string;
  prizeName: string;
  prizeEmoji: string;
  prizeId: string;
  spinId: string;
  transactionId: string;
  wonAt: string;
  tier: string;
  amountPaid: number;
  fulfillmentInstructions: string;
}

const generateManualPrizeEmailHTML = (data: NotifyManualPrizeRequest): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You Won: ${data.prizeName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 50%, #EC4899 100%);">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #000000; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 60px rgba(139, 92, 246, 0.3);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);">
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; background: linear-gradient(90deg, #FFD700 0%, #00FFFF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                SUPPORTERS WIN
              </h1>
            </td>
          </tr>
          
          <!-- Celebration -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
              <h2 style="margin: 0; color: #00FFFF; font-size: 36px; font-weight: bold;">
                Congratulations!
              </h2>
            </td>
          </tr>
          
          <!-- Prize Name -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <p style="margin: 0 0 10px; color: #FFFFFF; font-size: 18px;">
                You just won:
              </p>
              <p style="margin: 0; color: #FFD700; font-size: 32px; font-weight: bold; text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);">
                ${data.prizeEmoji} ${data.prizeName}
              </p>
            </td>
          </tr>
          
          <!-- Being Prepared Message -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1)); border-left: 4px solid #8B5CF6; padding: 20px; border-radius: 8px;">
                <p style="margin: 0 0 15px; color: #FFFFFF; font-size: 18px; font-weight: 600;">
                  🎨 Your personalized prize is being created!
                </p>
                <p style="margin: 0 0 10px; color: #CCCCCC; font-size: 16px; line-height: 1.6;">
                  We're preparing your <strong style="color: #FFD700;">${data.prizeName}</strong> and will send it within 24 hours.
                </p>
                <p style="margin: 0; color: #CCCCCC; font-size: 16px; line-height: 1.6;">
                  Check your email for a special delivery notification.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Spin Again -->
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <p style="margin: 0 0 15px; color: #AAAAAA; font-size: 16px;">
                Want more prizes?
              </p>
              <a href="https://supporterswin.com" style="display: inline-block; padding: 12px 30px; background-color: rgba(139, 92, 246, 0.2); color: #8B5CF6; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 50px; border: 2px solid #8B5CF6;">
                Spin Again
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #0A0A0A; border-top: 1px solid #1A1A1A;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center;">
                Transaction ID: ${data.transactionId}
              </p>
              <p style="margin: 0 0 15px; color: #888888; font-size: 14px; text-align: center;">
                Thank you for spinning with Supporters Win!
              </p>
              <p style="margin: 0; color: #666666; font-size: 12px; text-align: center;">
                <a href="https://supporterswin.com/support" style="color: #8B5CF6; text-decoration: none;">Support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const data: NotifyManualPrizeRequest = await req.json();
    console.log("Processing manual prize notification for:", data.email);

    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
    const webhookUser = Deno.env.get("N8N_WEBHOOK_AUTH_USER");
    const webhookPass = Deno.env.get("N8N_WEBHOOK_AUTH_PASS");

    if (!sendgridApiKey || !webhookUrl || !webhookUser || !webhookPass) {
      throw new Error("Required environment variables not configured");
    }

    // Send email to user
    const emailHTML = generateManualPrizeEmailHTML(data);
    let emailMessageId: string | null = null;
    let emailError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Email attempt ${attempt} to ${data.email}`);
        
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sendgridApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: data.email, name: data.userName }],
                subject: `🎉 You Won: ${data.prizeName} - Being Prepared!`,
              },
            ],
            from: {
              email: "noreply@supporterswin.com",
              name: "Supporters Win",
            },
            content: [
              {
                type: "text/html",
                value: emailHTML,
              },
            ],
            tracking_settings: {
              click_tracking: { enable: true },
              open_tracking: { enable: true },
            },
            asm: {
              group_id: 1,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
        }

        emailMessageId = response.headers.get("x-message-id");
        console.log(`Email sent successfully. Message ID: ${emailMessageId}`);
        emailError = null;
        break;
      } catch (error) {
        emailError = error as Error;
        console.error(`Email attempt ${attempt} failed:`, error);
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    // Log email attempt
    await supabase.from("email_logs").insert({
      user_email: data.email,
      spin_id: data.spinId,
      email_type: "prize_manual_pending",
      status: emailError ? "failed" : "sent",
      sendgrid_message_id: emailMessageId,
      error_message: emailError?.message,
    });

    // Send webhook to n8n
    const webhookPayload = {
      event: "manual_prize_won",
      user_email: data.email,
      user_name: data.userName,
      prize_id: data.prizeId,
      prize_name: data.prizeName,
      prize_emoji: data.prizeEmoji,
      spin_id: data.spinId,
      transaction_id: data.transactionId,
      won_at: data.wonAt,
      tier: data.tier,
      amount_paid: data.amountPaid,
      fulfillment_instructions: data.fulfillmentInstructions,
      admin_fulfill_url: `https://supporterswin.com/admin/fulfill/${data.spinId}`,
    };

    let webhookError: Error | null = null;
    let webhookResponseCode: number | null = null;

    try {
      console.log("Sending webhook to n8n:", webhookUrl);
      
      const authString = btoa(`${webhookUser}:${webhookPass}`);
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      webhookResponseCode = webhookResponse.status;
      
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(`n8n webhook error: ${webhookResponse.status} - ${errorText}`);
      }

      console.log("Webhook sent successfully");
    } catch (error) {
      webhookError = error as Error;
      console.error("Webhook failed (non-blocking):", error);
    }

    // Log webhook attempt
    await supabase.from("webhook_logs").insert({
      spin_id: data.spinId,
      webhook_url: webhookUrl,
      payload: webhookPayload,
      status: webhookError ? "failed" : "sent",
      response_code: webhookResponseCode,
      error_message: webhookError?.message,
    });

    // Update spin status to pending (waiting for admin fulfillment)
    await supabase
      .from("spins")
      .update({
        fulfillment_status: "pending",
      })
      .eq("id", data.spinId);

    return new Response(
      JSON.stringify({ 
        success: true,
        email_sent: !emailError,
        webhook_sent: !webhookError,
        message: "Manual prize notification sent" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-manual-prize:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});