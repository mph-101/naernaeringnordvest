const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, body, existingTags } = await req.json();

    const plain = ((title || "") + "\n" + (body || "")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    if (plain.length < 50) {
      return new Response(JSON.stringify({ tags: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit nådd. Prøv igjen om litt." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI-kreditt er brukt opp." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("suggest-tags error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
