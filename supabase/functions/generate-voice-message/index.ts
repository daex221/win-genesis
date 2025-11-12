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

    const { userEmail, prizeName, message, voiceId, spinId } = await req.json();

    if (!userEmail || !prizeName || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsApiKey) {
      console.error("[GENERATE-VOICE] Missing ELEVENLABS_API_KEY");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use provided voiceId or default to specified voice
    const selectedVoiceId = voiceId || "qFxVfZCiteIk9eM7FvbO";

    console.log("[GENERATE-VOICE] Generating audio with ElevenLabs for:", userEmail);

    // Call ElevenLabs API
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: message,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const error = await elevenLabsResponse.text();
      console.error("[GENERATE-VOICE] ElevenLabs API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to generate audio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get audio buffer
    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    const audioUint8Array = new Uint8Array(audioBuffer);

    // Upload to Supabase Storage
    const fileName = `shoutout_${Date.now()}_${spinId || 'manual'}.mp3`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("prize-audio")
      .upload(fileName, audioUint8Array, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[GENERATE-VOICE] Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload audio file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from("prize-audio")
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;
    console.log("[GENERATE-VOICE] Audio uploaded:", audioUrl);

    // Send email with audio link
    try {
      await supabaseClient.functions.invoke("send-prize-email", {
        body: {
          email: userEmail,
          userName: userEmail.split("@")[0],
          prizeName: prizeName,
          prizeEmoji: "🎤",
          prizeLink: audioUrl,
          transactionId: spinId ? `TX-${spinId.substring(0, 8)}` : "MANUAL",
          spinId: spinId || null,
        },
      });
      console.log("[GENERATE-VOICE] Email sent successfully");
    } catch (emailError) {
      console.error("[GENERATE-VOICE] Email error:", emailError);
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl: audioUrl,
        message: "Voice message generated and sent",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[GENERATE-VOICE] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
