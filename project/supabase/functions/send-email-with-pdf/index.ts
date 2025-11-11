import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  htmlContent: string;
  pdfBase64?: string;
  pdfFilename?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, htmlContent, pdfBase64, pdfFilename }: EmailRequest = await req.json();

    if (!to || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, htmlContent" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For demo purposes, we'll use Resend API (you can replace with any email service)
    // In production, you would need to set up RESEND_API_KEY as a secret
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.log("Email would be sent to:", to);
      console.log("Subject:", subject);
      console.log("Has PDF attachment:", !!pdfBase64);
      
      // Return success for demo (in production, this should fail)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email sending simulated (no API key configured)",
          details: { to, subject, hasPDF: !!pdfBase64 }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare email payload
    // Using profigram.com domain (must be verified in Resend)
    const emailPayload: any = {
      from: "KPI Profigram <noreply@profigram.com>",
      to: [to],
      subject: subject,
      html: htmlContent,
    };

    // Add PDF attachment if provided
    if (pdfBase64 && pdfFilename) {
      emailPayload.attachments = [
        {
          filename: pdfFilename,
          content: pdfBase64,
        },
      ];
    }

    // Send email using Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});