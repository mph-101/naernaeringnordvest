import { corsHeaders } from "../_shared/cors.ts";
import { aiChatCompletion, AiGatewayError } from "../_shared/ai-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { title, body, existingTags } = await req.json();

    const plain = ((title || "") + "\n" + (body || "")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    if (plain.length < 50) {
      return new Response(JSON.stringify({ tags: [] }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const existingList: string[] = Array.isArray(existingTags) ? existingTags : [];

    const prompt = `Du er en redaktør som tagger norske nyhetsartikler om lokalt næringsliv.
Foreslå 3–5 korte, presise nøkkelord (tags) som beskriver hva artikkelen handler om.

Regler:
- Bruk små bokstaver, norsk språk.
- Ett til tre ord per tag (helst ett eller to).
- Bruk emner/temaer/bransjer (f.eks. «oppdrettsnæring», «konkurs», «møre og romsdal»), ikke selskapsnavn eller personnavn.
- Ikke gjenta eksisterende tags: ${existingList.length ? existingList.join(", ") : "(ingen)"}.
- Returner BARE et JSON-array med strenger, ingenting annet.

Artikkel:
${plain.slice(0, 6000)}`;

    let data;
    try {
      data = await aiChatCompletion({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });
    } catch (e) {
      if (e instanceof AiGatewayError) {
        if (e.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit nådd. Prøv igjen om litt." }), {
            status: 429,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
        if (e.status === 402) {
          return new Response(JSON.stringify({ error: "AI-kreditt er brukt opp." }), {
            status: 402,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          });
        }
      }
      throw e;
    }

    const content = (data.choices?.[0]?.message?.content as string) || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    let tags: string[] = match ? JSON.parse(match[0]) : [];
    // Normalize: strings, lowercase, trimmed, deduped, length-bounded
    const seen = new Set<string>();
    tags = tags
      .map((t) => (typeof t === "string" ? t.trim().toLowerCase() : ""))
      .filter((t) => t.length >= 2 && t.length <= 40)
      .filter((t) => {
        if (seen.has(t)) return false;
        seen.add(t);
        return true;
      })
      .slice(0, 5);

    return new Response(JSON.stringify({ tags }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("suggest-tags error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
