// Public API endpoint that serves the news feed as JSON to subscribers.
// Authentication: Bearer token (API key) created in /profile.
//
// GET /functions/v1/feed-api?limit=20&offset=0&category=Næringsliv&region=vestlandet&lang=no
//
// Response shape:
// {
//   data: Array<{ id, title, excerpt, body, category, author, type, premium, region_slug,
//                 image_url, read_time, published_at, tags: string[] }>,
//   meta: { count, limit, offset, language }
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

// Per-key fair-use cap (F7). Generous: a feed reader polling every minute
// stays well under it; scripted scraping/hammering does not.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 300;

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  // 1) Read API key from Authorization header
  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return json(
      {
        error:
          "Missing API key. Send 'Authorization: Bearer <your_api_key>'.",
      },
      401,
    );
  }
  const apiKey = match[1].trim();
  if (apiKey.length < 20) {
    return json({ error: "Invalid API key format" }, 401);
  }

  // 2) Validate via service-role client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const keyHash = await sha256Hex(apiKey);
  const { data: validation, error: vErr } = await supabase.rpc(
    "validate_api_key",
    { _key_hash: keyHash },
  );

  if (vErr) {
    console.error("validate_api_key error", vErr);
    return json({ error: "Validation failed" }, 500);
  }

  const validRow = Array.isArray(validation) ? validation[0] : validation;
  if (!validRow) {
    return json(
      {
        error:
          "Invalid, expired or unauthorized key. Subscriber role is required.",
      },
      401,
    );
  }

  // 2b) Per-key rate limit (F7 + bolk 3c) — atomic bump in one DB statement so
  // concurrent requests can't bypass the cap via a read-modify-write race.
  const keyId = validRow.key_id as string;
  const { data: rlData, error: rlErr } = await supabase.rpc("bump_api_key_rate_limit", {
    _key_id: keyId,
    _max: MAX_REQUESTS_PER_WINDOW,
    _window_ms: RATE_LIMIT_WINDOW_MS,
  });
  if (rlErr) {
    // Fail open (as before): a rate-limiter outage must not break the feed for
    // paying subscribers.
    console.error("bump_api_key_rate_limit error", rlErr);
  } else {
    const decision = Array.isArray(rlData) ? rlData[0] : rlData;
    if (decision?.limited) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders(req),
            "Content-Type": "application/json",
            "Retry-After": String(decision.retry_after_seconds ?? 60),
          },
        },
      );
    }
  }

  // 2c) Premium gating (bolk 3b): validate_api_key only checks the subscriber
  // ROLE, which isn't revoked on cancellation. Gate premium bodies on
  // has_active_subscription() (same as the web paywall / check-article-access) so a
  // lapsed key can't pull full premium content in bulk. Fails closed for premium.
  const ownerId = validRow.user_id as string;
  const { data: activeData } = await supabase.rpc("has_active_subscription", {
    _user_id: ownerId,
  });
  const ownerActive = activeData === true;

  // 3) Parse query params
  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
    100,
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
    0,
  );
  const category = url.searchParams.get("category");
  const region = url.searchParams.get("region");
  const lang = (url.searchParams.get("lang") ?? "no").toLowerCase() === "en"
    ? "en"
    : "no";

  // 4) Build query
  let q = supabase
    .from("articles")
    .select(
      "id, title, title_en, excerpt, excerpt_en, body, body_en, category, author, type, premium, image_url, read_time, published_at, region_slug, key_points, key_points_en",
    )
    .eq("published", true)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) q = q.eq("category", category);
  if (region) q = q.eq("region_slug", region);

  const { data: articles, error: aErr } = await q;
  if (aErr) {
    console.error("articles query error", aErr);
    return json({ error: "Failed to fetch articles" }, 500);
  }

  // 5) Fetch tags for the returned articles
  const ids = (articles ?? []).map((a) => a.id);
  let tagMap = new Map<string, string[]>();
  if (ids.length > 0) {
    const { data: tagRows } = await supabase
      .from("article_tags")
      .select("article_id, tags(name)")
      .in("article_id", ids);
    (tagRows ?? []).forEach((row: any) => {
      if (!row.tags) return;
      const list = tagMap.get(row.article_id) ?? [];
      list.push(row.tags.name);
      tagMap.set(row.article_id, list);
    });
  }

  // 6) Shape the payload (localized)
  const data = (articles ?? []).map((a: any) => ({
    id: a.id,
    title: lang === "en" && a.title_en ? a.title_en : a.title,
    excerpt: lang === "en" && a.excerpt_en ? a.excerpt_en : a.excerpt,
    // Premium bodies only for active subscribers (bolk 3b); excerpt/key_points
    // remain as the teaser for everyone.
    body: a.premium && !ownerActive ? null : (lang === "en" && a.body_en ? a.body_en : a.body),
    category: a.category,
    author: a.author,
    type: a.type,
    premium: a.premium,
    image_url: a.image_url,
    read_time: a.read_time,
    region_slug: a.region_slug,
    published_at: a.published_at,
    key_points: lang === "en" && a.key_points_en ? a.key_points_en : a.key_points,
    tags: tagMap.get(a.id) ?? [],
    url: `https://${
      Deno.env.get("APP_DOMAIN") ?? "naernaering.lovable.app"
    }/article/${a.id}`,
  }));

  return json({
    data,
    meta: {
      count: data.length,
      limit,
      offset,
      language: lang,
      filters: { category, region },
    },
  });
});
