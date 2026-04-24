// Conversational AI grounded in the published article archive.
// 1. Embeds the latest user question
// 2. Pulls top-N matching published articles via pgvector RPC
// 3. Streams an answer that cites sources inline as [1], [2], ...
// 4. Sends the resolved sources back as a custom JSON line at the end
//    of the SSE stream so the client can render clickable links.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHAT_MODEL = "google/gemini-3-flash-preview";
const QUERY_REWRITE_MODEL = "google/gemini-2.5-flash-lite";
const MATCH_COUNT = 6;
const TRUSTED_MATCH_COUNT = 4;

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Use a small, fast LLM to extract the most distinctive search keywords
 * from the conversation. This dramatically improves recall for Postgres
 * full-text search compared to feeding the raw question (which is full of
 * stop-words and conversational filler).
 */
async function extractSearchTerms(question: string, apiKey: string): Promise<string> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: QUERY_REWRITE_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Du hjelper med å lage søk i en norsk avisarkivdatabase. Returner KUN 3–8 nøkkelord (egennavn, bransjer, steder, selskaper) fra brukerens spørsmål, atskilt med mellomrom. Ingen forklaring, ingen tegnsetting, ingen anførselstegn.",
          },
          { role: "user", content: question },
        ],
      }),
    });
    if (!resp.ok) return question;
    const json = await resp.json();
    const terms = json?.choices?.[0]?.message?.content as string | undefined;
    return (terms || question).trim();
  } catch {
    return question;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages mangler" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing required env vars");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Use the most recent user message as the search query
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    const queryText: string = lastUser?.content?.slice(0, 1500) || "";

    let sources: Array<{
      n: number;
      id: string;
      title: string;
      excerpt: string;
      author: string;
      published_at: string | null;
      rank: number;
    }> = [];
    let trustedSources: Array<{
      n: number;
      source_name: string;
      source_type: string;
      title: string | null;
      content: string;
      source_url: string | null;
      published_at: string | null;
    }> = [];
    let contextBlock = "";
    let trustedBlock = "";

    if (queryText.trim().length > 2) {
      try {
        const searchTerms = await extractSearchTerms(queryText, LOVABLE_API_KEY);
        console.log("articles-chat: search terms =", searchTerms);
        const [
          { data: matches, error: matchErr },
          { data: trusted, error: trustedErr },
        ] = await Promise.all([
          supabase.rpc("search_articles", { query_text: searchTerms, match_count: MATCH_COUNT }),
          supabase.rpc("search_trusted_sources", { query_text: searchTerms, match_count: TRUSTED_MATCH_COUNT }),
        ]);
        if (matchErr) console.error("search_articles error:", matchErr);
        if (trustedErr) console.error("search_trusted_sources error:", trustedErr);

        sources = (matches || []).map((m: any, i: number) => ({
          n: i + 1,
          id: m.id,
          title: m.title,
          excerpt: m.excerpt,
          author: m.author,
          published_at: m.published_at,
          rank: m.rank,
        }));

        contextBlock = (matches || [])
          .map((m: any, i: number) => {
            const date = m.published_at ? new Date(m.published_at).toISOString().slice(0, 10) : "";
            const body = stripHtml(m.body || "").slice(0, 1200);
            return `[${i + 1}] "${m.title}" — ${m.author}${date ? `, ${date}` : ""}\nIngress: ${m.excerpt}\nUtdrag: ${body}`;
          })
          .join("\n\n---\n\n");

        const baseN = sources.length;
        trustedSources = (trusted || []).map((t: any, i: number) => ({
          n: baseN + i + 1,
          source_name: t.source_name,
          source_type: t.source_type,
          title: t.title,
          content: t.content,
          source_url: t.source_url,
          published_at: t.published_at,
        }));
        trustedBlock = (trusted || [])
          .map((t: any, i: number) => {
            const date = t.published_at ? new Date(t.published_at).toISOString().slice(0, 10) : "";
            const snippet = (t.content || "").slice(0, 1000);
            return `[${baseN + i + 1}] ${t.title || t.source_name} — kilde: ${t.source_name}${date ? `, ${date}` : ""}\n${snippet}`;
          })
          .join("\n\n---\n\n");
      } catch (e) {
        console.error("retrieval failed:", e);
      }
    }

    const systemPrompt = `Du er Spør, en kunnskapsrik redaksjonsassistent for nettavisen Nær Næring. Svar utelukkende basert på de oppgitte artikkelutdragene under. Hver gang du bruker informasjon fra en kilde, siter den inline med [1], [2] osv. som tilsvarer kildelisten.

Regler:
- Svar alltid på norsk (bokmål eller nynorsk slik kildene er skrevet).
- Vær konkret, presis og nøktern — som en god lokalavisjournalist.
- Hvis kildene ikke gir grunnlag for å svare, si tydelig "Jeg fant ingen artikler i arkivet om dette" og foreslå et omformulert spørsmål.
- Aldri dikt opp tall, navn eller hendelser som ikke står i kildene.
- Skriv kort: gjerne en oppsummerende setning, deretter kulepunkter eller en kort tabell hvis det passer.

${sources.length > 0 ? `KILDER (publiserte artikler i Nær Næring):\n\n${contextBlock}\n\n` : ""}${trustedSources.length > 0 ? `BETRODDE EKSTERNE KILDER (kuratert av redaksjonen):\n\n${trustedBlock}` : ""}${sources.length === 0 && trustedSources.length === 0 ? "Ingen relevante artikler eller betrodde kilder ble funnet for dette spørsmålet." : ""}`;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørsler, prøv igjen om litt." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kreditt oppbrukt — kontakt redaksjonen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await upstream.text();
      console.error("AI gateway error:", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI-feil" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pipe upstream SSE through, then append a custom `event: sources` line at the end
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const encoder = new TextEncoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          // Send our sources as a synthetic SSE event the client knows about
          const sourcesPayload = `event: sources\ndata: ${JSON.stringify({ sources })}\n\n`;
          controller.enqueue(encoder.encode(sourcesPayload));
        } catch (e) {
          console.error("stream pipe error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("articles-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukjent feil" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});