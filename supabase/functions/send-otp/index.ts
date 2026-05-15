import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { action, phone, code, redirectTo } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (action === "send") {
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
    }

    if (action === "verify") {
      console.log(`Verifying login for ${phone}...`);
      const dummyEmail = `${phone.replace("+", "")}@rideshare.com`;

      // 1. Try to generate link
      let { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: dummyEmail,
        options: { redirectTo },
      });

      // 2. If user doesn't exist (error code 422 or message contains user not found), create them
      if (
        error &&
        (error.status === 422 ||
          error.message?.toLowerCase().includes("not found"))
      ) {
        console.log(`User ${dummyEmail} not found, creating...`);
        const { error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email: dummyEmail,
            email_confirmed: true,
            user_metadata: { phone_number: phone },
          });

        if (createError) throw createError;

        // Try generating link again
        const retry = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: dummyEmail,
          options: { redirectTo },
        });
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, link: data.properties.action_link }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.status || "Unknown status",
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
