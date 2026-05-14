import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();

    // Hubtel Credentials
    const clientid = "vtisadxo";
    const clientsecret = "zbscxlud";
    const from = "IGNYTE";

    const message = `Your RideShare verification code is: ${code}`;

    // Call Hubtel API
    const cleanPhone = phone.replace("+", "");
    const hubtelUrl = `https://smsc.hubtel.com/v1/messages/send?clientsecret=${clientsecret}&clientid=${clientid}&from=${from}&to=${cleanPhone}&content=${encodeURIComponent(message)}`;

    console.log(`Sending SMS to ${cleanPhone}...`);

    const hubtelRes = await fetch(hubtelUrl);
    const hubtelData = await hubtelRes.json();

    return new Response(JSON.stringify({ success: true, data: hubtelData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
