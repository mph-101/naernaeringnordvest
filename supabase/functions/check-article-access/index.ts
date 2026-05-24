import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

import { corsHeaders } from "../_shared/cors.ts";

// Decided with Magnus (2026-05-24):
//   - Logged-in users get 3 free premium articles per rolling 90 days
//   - Anonymous users (cookie visitor_id) get 1 free per rolling 90 days
const FREE_QUOTA_AUTHENTICATED = 3;
const FREE_QUOTA_ANONYMOUS = 1;
const FREE_WINDOW_DAYS = 90;
const STAFF_ROLES = new Set(["admin", "editor", "journalist", "subscriber", "business"]);

const BodySchema = z.object({
  articleId: z.string().min(1).max(256),
  // Optional client-generated UUID stored in localStorage for anonymous
  // visitors. We accept anything 8-64 chars to be permissive of UUIDv4 etc.
  visitorId: z.string().min(8).max(64).optional(),
});

type AccessResponse =
  | { access: "full"; body: string | null; body_en: string | null; freeReadsRemaining?: number; freeQuota?: number }
  | { access: "preview"; preview: string | null; preview_en: string | null; reason: "anon_no_login" | "quota_exhausted" | "not_premium_fallback" | "subscription_required"; freeReadsRemaining?: number; freeQuota?: number };

// Picks the first paragraph out of either HTML or plain text body.
// Exported for unit-testing.
export function firstParagraph(txt: string | null): string | null {
  if (!txt) return null;
  const isHtml = /<[a-z][\s\S]*>/i.test(txt);
  if (isHtml) {
    const match = txt.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    return match ? `<p>${match[1]}</p>` : null;
  }
  const para = txt.split(/\n\s*\n/)[0]?.trim();
  return para || null;
}

interface ResolveAccessDeps {
  sbAdmin: SupabaseClient;
  authHeader: string | null;
}

// The core logic, exported so it can be unit-tested with a mocked client.
export async function resolveAccess(
  articleId: string,
  visitorId: string | undefined,
  deps: ResolveAccessDeps
): Promise<{ status: number; body: AccessResponse | { error: string } }> {
  const { sbAdmin, authHeader } = deps;

  const { data: article, error: artErr } = await sbAdmin
    .from("articles")
    .select("id, premium, body, body_en, published")
    .eq("id", articleId)
    .maybeSingle();

  if (artErr || !article || !article.published) {
    return { status: 404, body: { error: "Not found" } };
  }

  // Free article — always full access
  if (!article.premium) {
    return {
      status: 200,
      body: {
        access: "full",
        body: article.body as string | null,
        body_en: article.body_en as string | null,
      },
    };
  }

  // Premium path: identify the caller
  let userId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const sbUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await sbUser.auth.getClaims(token);
      userId = (claimsData?.claims?.sub as string) ?? null;
    } catch (e) {
      // Invalid token → treat as anon. Logging only.
      console.warn("check-article-access: invalid bearer token", e);
    }
  }

  // 1) Active subscription / staff → full
  if (userId) {
    try {
      const { data: subResult } = await sbAdmin.rpc("has_active_subscription", { _user_id: userId });
      if (subResult === true) {
        return { status: 200, body: { access: "full", body: article.body, body_en: article.body_en } };
      }
      const { data: roles } = await sbAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const hasStaffRole = (roles ?? []).some((r) => STAFF_ROLES.has(r.role));
      if (hasStaffRole) {
        return { status: 200, body: { access: "full", body: article.body, body_en: article.body_en } };
      }
    } catch (e) {
      // Subscription check crashed. Fail SAFE for the user (give preview,
      // not 500). They can complain instead of seeing nothing.
      console.error("subscription check failed, returning preview:", e);
      return {
        status: 200,
        body: {
          access: "preview",
          preview: firstParagraph(article.body as string | null),
          preview_en: firstParagraph(article.body_en as string | null),
          reason: "subscription_required",
        },
      };
    }
  }

  // 2) Free-quota path
  const since = new Date(Date.now() - FREE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const grantSelectors = userId
    ? { column: "user_id", value: userId, quota: FREE_QUOTA_AUTHENTICATED }
    : visitorId
      ? { column: "visitor_id", value: visitorId, quota: FREE_QUOTA_ANONYMOUS }
      : null;

  if (!grantSelectors) {
    // Anonymous without visitor_id: cannot track, must show preview with
    // login CTA. The frontend should always send visitorId; this branch
    // is mostly a safety net.
    return {
      status: 200,
      body: {
        access: "preview",
        preview: firstParagraph(article.body as string | null),
        preview_en: firstParagraph(article.body_en as string | null),
        reason: "anon_no_login",
        freeReadsRemaining: 0,
        freeQuota: FREE_QUOTA_ANONYMOUS,
      },
    };
  }

  // 2a) Already granted for THIS article → free re-visit, no quota cost
  try {
    const { data: existing } = await sbAdmin
      .from("premium_article_grants")
      .select("id")
      .eq(grantSelectors.column, grantSelectors.value)
      .eq("article_id", articleId)
      .maybeSingle();

    if (existing) {
      // Re-visit. Still count remaining quota for UI.
      const { count } = await sbAdmin
        .from("premium_article_grants")
        .select("id", { count: "exact", head: true })
        .eq(grantSelectors.column, grantSelectors.value)
        .gte("granted_at", since);
      const used = count ?? 0;
      return {
        status: 200,
        body: {
          access: "full",
          body: article.body as string | null,
          body_en: article.body_en as string | null,
          freeReadsRemaining: Math.max(0, grantSelectors.quota - used),
          freeQuota: grantSelectors.quota,
        },
      };
    }

    // 2b) Count NEW grants used in the rolling window
    const { count } = await sbAdmin
      .from("premium_article_grants")
      .select("id", { count: "exact", head: true })
      .eq(grantSelectors.column, grantSelectors.value)
      .gte("granted_at", since);
    const used = count ?? 0;

    if (used < grantSelectors.quota) {
      // Grant this article. We INSERT and tolerate the 23505 unique-
      // violation that happens if two parallel checks for the same
      // article both miss the existing-row probe above. We can't use
      // .upsert(onConflict: ...) here because our unique indexes are
      // PARTIAL and onConflict needs a real constraint or full index.
      const { error: insErr } = await sbAdmin
        .from("premium_article_grants")
        .insert(
          userId
            ? { user_id: userId, article_id: articleId }
            : { visitor_id: grantSelectors.value, article_id: articleId }
        );
      if (insErr && insErr.code !== "23505") {
        // Real failure (not a race-condition duplicate). Fail SAFE → preview.
        console.error("grant insert failed:", insErr);
        return {
          status: 200,
          body: {
            access: "preview",
            preview: firstParagraph(article.body as string | null),
            preview_en: firstParagraph(article.body_en as string | null),
            reason: "subscription_required",
          },
        };
      }
      return {
        status: 200,
        body: {
          access: "full",
          body: article.body as string | null,
          body_en: article.body_en as string | null,
          freeReadsRemaining: Math.max(0, grantSelectors.quota - used - 1),
          freeQuota: grantSelectors.quota,
        },
      };
    }

    // Quota exhausted
    return {
      status: 200,
      body: {
        access: "preview",
        preview: firstParagraph(article.body as string | null),
        preview_en: firstParagraph(article.body_en as string | null),
        reason: "quota_exhausted",
        freeReadsRemaining: 0,
        freeQuota: grantSelectors.quota,
      },
    };
  } catch (e) {
    // Quota table is unreachable. Fail SAFE → preview.
    console.error("grant table check failed, returning preview:", e);
    return {
      status: 200,
      body: {
        access: "preview",
        preview: firstParagraph(article.body as string | null),
        preview_en: firstParagraph(article.body_en as string | null),
        reason: "subscription_required",
      },
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const result = await resolveAccess(parsed.data.articleId, parsed.data.visitorId, {
      sbAdmin,
      authHeader: req.headers.get("Authorization"),
    });

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("check-article-access error:", message);
    // Even at the top level, fail SAFE: return preview if we can, never
    // leak the body.
    return new Response(
      JSON.stringify({ access: "preview", preview: null, preview_en: null, reason: "subscription_required" }),
      { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
