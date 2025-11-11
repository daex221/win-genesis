import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FulfillManualPrizeRequest {
  spinId: string;
  prizeLink: string;
}

const generateCompletionEmailHTML = (
  userName: string,
  prizeName: string,
  prizeEmoji: string,
  prizeLink: string,
  transactionId: string
): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${prizeName} is Ready!</title>
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
          
          <!-- Ready Icon -->
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 20px;">✨</div>
              <h2 style="margin: 0; color: #00FFFF; font-size: 36px; font-weight: bold;">
                Your Prize is Ready!
              </h2>
            </td>
          </tr>
          
          <!-- Prize Ready Message -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1)); border-left: 4px solid #10B981; padding: 20px; border-radius: 8px;">
                <p style="margin: 0 0 10px; color: #FFFFFF; font-size: 18px; font-weight: 600;">
                  Great news! Your personalized prize is ready.
                </p>
                <p style="margin: 0; color: #CCCCCC; font-size: 16px; line-height: 1.6;">
                  Here's your: <strong style="color: #FFD700;">${prizeEmoji} ${prizeName}</strong>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- View Prize Button -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center;">
              <a href="${prizeLink}" style="display: inline-block; padding: 18px 50px; background: linear-gradient(90deg, #10B981 0%, #3B82F6 100%); color: #FFFFFF; text-decoration: none; font-size: 20px; font-weight: bold; border-radius: 50px; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);">
                VIEW PRIZE 🎁
              </a>
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
                Transaction ID: ${transactionId}
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

    const { spinId, prizeLink }: FulfillManualPrizeRequest = await req.json();
    console.log("Fulfilling manual prize for spin:", spinId);

    // Get spin details
    const { data: spin, error: spinError } = await supabase
      .from("spins")
      .select("*, prize_id")
      .eq("id", spinId)
      .single();

    if (spinError || !spin) {
      throw new Error("Spin not found");
    }

    // Get prize details
    const { data: prize, error: prizeError } = await supabase
      .from("prize_metadata")
      .select("name, emoji")
      .eq("id", spin.prize_id)
      .single();

    if (prizeError || !prize) {
      throw new Error("Prize not found");
    }

    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      throw new Error("SENDGRID_API_KEY not configured");
    }

    // Extract user name from email (simple version)
    const userName = spin.email.split("@")[0];
    const emailHTML = generateCompletionEmailHTML(
      userName,
      prize.name,
      prize.emoji,
      prizeLink,
      `TX-${spinId.substring(0, 8)}`
    );

    // Send completion email
    let emailMessageId: string | null = null;
    let emailError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Email attempt ${attempt} to ${spin.email}`);
        
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sendgridApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: spin.email, name: userName }],
                subject: `✨ Your ${prize.name} is Ready!`,
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
        console.log(`Completion email sent. Message ID: ${emailMessageId}`);
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
      user_email: spin.email,
      spin_id: spinId,
      email_type: "prize_manual_complete",
      status: emailError ? "failed" : "sent",
      sendgrid_message_id: emailMessageId,
      error_message: emailError?.message,
    });

    if (emailError) {
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    // Update spin status to completed
    const { error: updateError } = await supabase
      .from("spins")
      .update({
        fulfillment_status: "completed",
        fulfilled_at: new Date().toISOString(),
      })
      .eq("id", spinId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Prize fulfilled and email sent successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fulfill-manual-prize:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});