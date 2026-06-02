import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Webhook payload received:", JSON.stringify(payload, null, 2));

    const record = payload.record;
    if (!record || !record.media_url) {
      console.log("No record or media_url found in payload. Exiting.");
      return new Response("ok", { headers: corsHeaders, status: 200 });
    }

    // Extract the storage path from the public URL
    // e.g., "https://xyz.supabase.co/storage/v1/object/public/ocr-diagrams/manual_crops/123.jpg"
    // We need "manual_crops/123.jpg"
    let filePath = "";
    try {
      const url = new URL(record.media_url);
      const parts = url.pathname.split("/ocr-diagrams/");
      if (parts.length > 1) {
        filePath = parts[1];
      } else {
        throw new Error("Could not find /ocr-diagrams/ in URL path");
      }
    } catch (e) {
      console.error("Failed to parse media_url:", record.media_url, e);
      return new Response("ok", { headers: corsHeaders, status: 200 }); // Return 200 so webhook doesn't retry infinitely on bad data
    }

    console.log(`Processing diagram at path: ${filePath}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAdminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAdminKey) {
      throw new Error("Missing Supabase configuration env vars");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

    // 1. Download the raw, messy image bytes from the storage bucket
    console.log(`Downloading raw crop from storage...`);
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from("ocr-diagrams")
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message}`);
    }

    const rawBytes = new Uint8Array(await fileData.arrayBuffer());

    // 2. Forward the file bytes to Render service
    const cleanerUrl = Deno.env.get("DIAGRAM_CLEANER_URL");
    if (!cleanerUrl) {
      throw new Error("DIAGRAM_CLEANER_URL environment variable is not set");
    }

    console.log(`Sending buffer to Render diagram cleaner asynchronously...`);
    const formData = new FormData();
    const imageBlob = new Blob([rawBytes], { type: 'image/jpeg' });
    formData.append('file', imageBlob, 'crop.jpg');

    const cleanerApiKey = Deno.env.get("DIAGRAM_CLEANER_API_KEY");
    const fetchHeaders = new Headers();
    if (cleanerApiKey) {
      fetchHeaders.set("Authorization", `Bearer ${cleanerApiKey}`);
    }

    // Extended timeout or no explicit timeout for webhook
    const response = await fetch(cleanerUrl, {
      method: "POST",
      body: formData,
      headers: fetchHeaders,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cleaner service returned status ${response.status}: ${errText}`);
    }

    // 3. Catch the clean PNG array buffer returned by the Render microservice
    const cleanArrayBuffer = await response.arrayBuffer();
    const cleanUint8Array = new Uint8Array(cleanArrayBuffer);
    console.log("Successfully received clean vector-rendered PNG from microservice.");

    // 4. Upload (Overwrite) the clean bytes directly back to the EXACT SAME file path
    console.log(`Overwriting ${filePath} with clean PNG...`);
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from("ocr-diagrams")
      .upload(filePath, cleanUint8Array, { 
        contentType: "image/png", 
        upsert: true 
      });

    if (uploadError) {
      throw new Error(`Failed to upload clean image back to storage: ${uploadError.message}`);
    }

    console.log(`Successfully completed diagram cleanup for ${filePath}`);
    return new Response(JSON.stringify({ success: true, message: "Diagram cleaned and updated." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in cleanup-diagram webhook:", error);
    // Return 200 to acknowledge the webhook, otherwise Supabase might retry it
    // Or return 500 depending on desired retry policy. We'll return 500 to let it retry if transient.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
