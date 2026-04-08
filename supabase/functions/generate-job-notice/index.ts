import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { person_name, new_role, new_company, old_role, old_company, change_type, source_text } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const parts = [];
    if (person_name) parts.push(`Person: ${person_name}`);
    if (change_type === "new_job") parts.push("Type: Ny jobb");
    if (change_type === "job_change") parts.push("Type: Byttet jobb");
    if (change_type === "promotion") parts.push("Type: Rykket opp");
    if (new_role) parts.push(`Ny rolle: ${new_role}`);
    if (new_company) parts.push(`Nytt selskap: ${new_company}`);
    if (old_role) parts.push(`Gammel rolle: ${old_role}`);
    if (old_company) parts.push(`Gammelt selskap: ${old_company}`);

    let infoBlock = parts.join("\n");
    if (source_text) {
      infoBlock += `\n\nKildetekst:\n${source_text}`;
    }

    const systemPrompt = `Du er en journalist som skriver profesjonelle nyhetsnotiser om jobbytter i idretts- og mediebransjen på norsk.

Returner ALLTID svaret som gyldig JSON med følgende struktur:
{
  "title": "Kort, fengende tittel",
  "ingress": "En setning som oppsummerer nyheten",
  "key_points": {
    "name": "Personens fulle navn",
    "role": "Ny stillingstittel",
    "company": "Nytt selskap"
  },
  "body": "Et avsnitt på 100-200 ord. Alltid ta med tidligere stilling og selskap om tilgjengelig. Skriv saklig og profesjonelt."
}

Returner KUN JSON, ingen annen tekst.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: infoBlock },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørsler, prøv igjen om litt." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Kreditt oppbrukt." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Try to parse structured JSON from the AI response
    let notice = raw;
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      // Store as JSON string for structured rendering
      notice = JSON.stringify(parsed);
    } catch {
      // If parsing fails, keep raw text as fallback
    }

    return new Response(JSON.stringify({ notice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-job-notice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
