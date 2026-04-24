import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  articleId: z.string().min(1).max(256),
});

/**
 * Returns the article body ONLY if the caller has a valid subscription.
 * For unauthenticated/non-subscribers, returns excerpt + first paragraph
 * preview so the page can render a paywall card without leaking content.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const articleId = parsed.data.articleId;

    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: article, error: artErr } = await sbAdmin
      .from("articles")
      .select("id, premium, body, body_en, published")
      .eq("id", articleId)
      .maybeSingle();

    if (artErr || !article || !article.published) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Free article — full access for everyone
    if (!article.premium) {
      return new Response(
        JSON.stringify({
          access: "full",
          body: article.body,
          body_en: article.body_en,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Premium — check subscription via authenticated user
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const sbUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData } = await sbUser.auth.getClaims(token);
      userId = (claimsData?.claims?.sub as string) ?? null;
    }

    let hasAccess = false;
    if (userId) {
      const { data: result } = await sbAdmin.rpc("has_active_subscription", { _user_id: userId });
      hasAccess = !!result;

      // Staff and admins always get access
      if (!hasAccess) {
        const { data: roles } = await sbAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        const allowedRoles = new Set(["admin", "editor", "journalist", "subscriber", "business"]);
        hasAccess = (roles ?? []).some((r) => allowedRoles.has(r.role));
      }
    }

    if (hasAccess) {
      return new Response(
        JSON.stringify({ access: "full", body: article.body, body_en: article.body_en }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build preview: first paragraph from each language
    const firstParagraph = (txt: string | null) => {
      if (!txt) return null;
      const isHtml = /<[a-z][\s\S]*>/i.test(txt);
      if (isHtml) {
        const match = txt.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        return match ? `<p>${match[1]}</p>` : null;
      }
      const para = txt.split(/\n\s*\n/)[0]?.trim();
      return para || null;
    };

    return new Response(
      JSON.stringify({
        access: "preview",
        preview: firstParagraph(article.body),
        preview_en: firstParagraph(article.body_en),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("check-article-access error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});