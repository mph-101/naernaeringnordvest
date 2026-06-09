// Editorial-only endpoint: read back article_provenance_responses INCLUDING the
// internal `note` column. The public column-REVOKE blocks anon/authenticated from
// SELECTing `note`, so the admin UI can write a note but not read it back via the
// normal client. This service-role function returns it after verifying the caller
// holds an editorial role (admin/editor/journalist). Mirrors admin-create-user's
// auth pattern. verify_jwt stays default (true) — authenticated callers only.
//
//   POST { article_id }   (via supabase.functions.invoke — sends auth header)
//   GET  ?article_id=<uuid>   (for manual testing)
//   -> { responses: [{ party_name, party_role, status, note, sort_order }] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

async function readArticleId(req: Request): Promise<string | undefined> {
  if (req.method === "GET") {
    return new URL(req.url).searchParams.get("article_id")?.trim() || undefined;
  }
  try {
    const body = await req.json();
    return typeof body?.article_id === "string" ? body.article_id.trim() : undefined;
  } catch {
    return undefined;
  }
}

export const handler = async (req: Request): Promise<Response> => {
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  // Identify caller
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Editorial-role gate (admin/editor/journalist)
  const { data: isEditorial, error: roleErr } = await admin.rpc("has_editorial_role", {
    _user_id: userRes.user.id,
  });
  if (roleErr) {
    console.error("has_editorial_role check failed", roleErr);
    return json({ error: "Role check failed" }, 500);
  }
  if (!isEditorial) return json({ error: "Insufficient privileges" }, 403);

  const articleId = await readArticleId(req);
  if (!articleId) return json({ error: "Missing article_id" }, 400);

  const { data, error } = await admin
    .from("article_provenance_responses")
    .select("party_name, party_role, status, note, sort_order")
    .eq("article_id", articleId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("responses fetch failed", error);
    return json({ error: "Lookup failed" }, 500);
  }

  return json({ responses: data ?? [] });
};

if (import.meta.main) {
  Deno.serve(handler);
}
