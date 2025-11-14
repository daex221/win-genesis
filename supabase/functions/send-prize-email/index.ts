import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  prizeData: {
    name: string;
    emoji: string;
    deliveryContent: string;
    tier: string;
    userName?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, prizeData }: EmailRequest = await req.json();
    const tier = prizeData.tier;

    console.log(`[SEND-PRIZE-EMAIL] Sending ${prizeData.name} to ${email} (${tier} tier)`);

    if (!email || !prizeData) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    const FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@supporterswin.com";

    if (!SENDGRID_API_KEY) {
      console.error("[SEND-PRIZE-EMAIL] SendGrid API key not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email content based on prize type
    let emailSubject = "";
    let emailHtml = "";
    let emailText = "";

    // Determine prize type based on content (URL = video, uppercase = code, else message)
    const isVideoLink = prizeData.deliveryContent.startsWith('http');
    const isCode = !isVideoLink && /^[A-Z0-9-]{6,}$/.test(prizeData.deliveryContent);

    if (isVideoLink) {
      emailSubject = `🎉 Your ${tier.toUpperCase()} Mystery Video is Here!`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .prize-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .video-link { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .emoji { font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">${prizeData.emoji}</div>
              <h1>Congratulations!</h1>
              <p>You Won: ${prizeData.name}</p>
              <p><strong>${tier.toUpperCase()} Tier</strong></p>
            </div>
            <div class="content">
              <div class="prize-box">
                <h2>Your Exclusive Content:</h2>
                <p>As a ${tier.toUpperCase()} tier member, here's your exclusive mystery video:</p>
                <p style="word-break: break-all;"><strong>${prizeData.deliveryContent}</strong></p>
                <center>
                  <a href="${prizeData.deliveryContent}" class="video-link">🎥 Watch Your Video</a>
                </center>
              </div>
              <p><strong>Important:</strong></p>
              <ul>
                <li>This link is exclusive to you</li>
                <li>Save this email for future access</li>
                <li>Enjoy your ${tier} tier exclusive content!</li>
              </ul>
            </div>
            <div class="footer">
              <p>Thank you for being a ${tier.toUpperCase()} supporter!</p>
              <p>&copy; ${new Date().getFullYear()} Supporterswin. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      emailText = `
Congratulations! ${prizeData.emoji}

You Won: ${prizeData.name}
Tier: ${tier.toUpperCase()}

Your Exclusive ${tier.toUpperCase()} Content:
${prizeData.deliveryContent}

Watch your video here: ${prizeData.deliveryContent}

Important:
- This link is exclusive to you
- Save this email for future access
- Enjoy your ${tier} tier exclusive content!

Thank you for being a ${tier.toUpperCase()} supporter!

© ${new Date().getFullYear()} Supporterswin. All rights reserved.
      `.trim();
    } else if (isCode) {
      emailSubject = `🎉 Your ${tier.toUpperCase()} Discount Code!`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .code-box { background: white; padding: 30px; margin: 20px 0; border-radius: 8px; border: 3px dashed #667eea; text-align: center; }
            .code { font-size: 28px; font-weight: bold; color: #667eea; letter-spacing: 2px; }
            .emoji { font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">${prizeData.emoji}</div>
              <h1>Congratulations!</h1>
              <p>You Won: ${prizeData.name}</p>
            </div>
            <div class="content">
              <div class="code-box">
                <p><strong>Your ${tier.toUpperCase()} Tier Code:</strong></p>
                <p class="code">${prizeData.deliveryContent}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      emailText = `
Congratulations! ${prizeData.emoji}

You Won: ${prizeData.name}

Your ${tier.toUpperCase()} Tier Code: ${prizeData.deliveryContent}
      `.trim();
    } else {
      // Message type
      emailSubject = `🎉 Prize Won: ${prizeData.name}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>Congratulations! ${prizeData.emoji}</h1>
            <h2>${prizeData.name}</h2>
            <p>${prizeData.deliveryContent}</p>
          </div>
        </body>
        </html>
      `;
      emailText = `Congratulations! ${prizeData.emoji}\n\n${prizeData.name}\n\n${prizeData.deliveryContent}`;
    }

    // Send email via SendGrid
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
            subject: emailSubject,
          },
        ],
        from: {
          email: FROM_EMAIL,
          name: "Supporterswin",
        },
        content: [
          {
            type: "text/plain",
            value: emailText,
          },
          {
            type: "text/html",
            value: emailHtml,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SEND-PRIZE-EMAIL] SendGrid error:", errorText);
      throw new Error(`SendGrid API error: ${response.status}`);
    }

    console.log("[SEND-PRIZE-EMAIL] Email sent successfully to", email);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEND-PRIZE-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
