import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const BRREG_BASE = "https://data.brreg.no";

// Match a free-form company name against BRREG and return { name, orgnr }
// when we are confident. Returns orgnr=null when no clear winner.
//
// Strategy mirrors brreg-proxy's "search" action:
//   1. Strip legal suffix, pick the longest token as the primary query
//   2. Fetch up to 100 candidates from enheter without orgform filter (catches
//      NUF/UTLA entities)
//   3. Rank candidates against the original name, accept only when the top
//      score is high AND clearly better than the runner-up (avoids picking
//      "VEØY BUSS AS" when the article says "Veøy AS")
async function matchOrgnr(rawName: string): Promise<string | null> {
  const cleaned = rawName.trim().toLowerCase();
  if (!cleaned) return null;
  const stripped = cleaned.replace(/\s+(as|asa|sa|ans|da|ba)$/i, "").trim();
  const tokens = stripped.split(/\s+/).filter(Boolean);
  const primaryToken = tokens.sort((a, b) => b.length - a.length)[0] || stripped;

  const url = `${BRREG_BASE}/enhetsregisteret/api/enheter?navn=${encodeURIComponent(primaryToken)}&size=100&sort=navn,asc`;

  let candidates: any[] = [];
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    candidates = data?._embedded?.enheter || [];
  } catch {
    return null;
  }

  if (candidates.length === 0) return null;

  const score = (navn: string): number => {
    const n = (navn || "").toLowerCase();
    if (n === cleaned) return 100;
    if (n === `${stripped} as` || n === `${stripped} asa`) return 95;
    if (n === stripped) return 92;
    if (n.startsWith(`${cleaned} `)) return 85;
    if (n.startsWith(`${stripped} `)) return 75;
    if (n.startsWith(cleaned)) return 70;
    if (n.startsWith(stripped)) return 60;
    if (n.includes(` ${stripped} `) || n.endsWith(` ${stripped}`)) return 50;
    if (n.includes(stripped)) return 30;
    if (tokens.length > 1 && n.includes(primaryToken)) return 20;
    return 0;
  };

  const ranked = candidates
    .map((e: any) => ({ e, s: score(e.navn) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  if (ranked.length === 0) return null;

  const top = ranked[0];
  const runnerUp = ranked[1];

  // Accept when the top score is at least 60 (prefix-or-exact match) AND
  // either there is no runner-up, or the top is meaningfully better.
  // This keeps us from picking ambiguous "X AS" out of many similarly-named.
  if (top.s < 60) return null;
  if (runnerUp && runnerUp.s >= top.s - 10) return null;

  return top.e.organisasjonsnummer || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const { body } = await req.json();

    if (!body || body.length < 50) {
      return new Response(JSON.stringify({ companies: [] }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const plainText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const prompt = `From the following Norwegian article text, extract all company names (Norwegian or international businesses) that are explicitly mentioned. Return ONLY a JSON array of strings with the company names. If no companies are found, return an empty array [].

Article:
${plainText.slice(0, 4000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    const rawNames: string[] = match ? JSON.parse(match[0]) : [];

    // Deduplicate and limit to 20 to bound the BRREG calls below
    const uniqueNames = Array.from(new Set(rawNames.map((n) => n.trim()).filter(Boolean))).slice(0, 20);

    // Resolve each name to an orgnr where possible (parallel, but BRREG
    // tolerates this well at this scale)
    const companies = await Promise.all(
      uniqueNames.map(async (name) => ({
        name,
        orgnr: await matchOrgnr(name),
      }))
    );

    return new Response(JSON.stringify({ companies }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("suggest-companies error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
