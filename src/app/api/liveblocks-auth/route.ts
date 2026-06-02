import { Liveblocks } from "@liveblocks/node";
import { createSupabaseServer } from "@/lib/supabase-next/server";

/**
 * Liveblocks authentication endpoint.
 *
 * The browser's Liveblocks client POSTs here (no public key client-side). We:
 *   1. verify the caller's Supabase session (JWT in the auth cookies),
 *   2. confirm they hold an editorial role (admin/editor/journalist),
 *   3. mint a scoped Liveblocks session token for `article:*` rooms.
 *
 * If LIVEBLOCKS_SECRET_KEY is missing the route returns 501 so the editor can
 * fall back to non-collaborative mode instead of throwing.
 */

const STAFF_ROLES = ["admin", "editor", "journalist"] as const;

// Deterministic caret color from the user id (stable across sessions).
const CARET_COLORS = [
  "#c2542d", "#2d6b4f", "#1f6f8b", "#8b5cf6", "#d97706",
  "#db2777", "#0891b2", "#65a30d", "#dc2626", "#7c3aed",
];
function colorForUser(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CARET_COLORS[hash % CARET_COLORS.length];
}

export async function POST() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    return new Response("Liveblocks not configured", { status: 501 });
  }

  const supabase = await createSupabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify the caller holds at least one editorial role.
  const roleChecks = await Promise.all(
    STAFF_ROLES.map((role) =>
      supabase.rpc("has_role", { _user_id: user.id, _role: role }),
    ),
  );
  const isStaff = roleChecks.some(({ data }) => data === true);
  if (!isStaff) {
    return new Response("Forbidden", { status: 403 });
  }

  const liveblocks = new Liveblocks({ secret });

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    "Redaktør";

  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: displayName,
      color: colorForUser(user.id),
    },
  });

  // Editorial staff may collaborate on any article room.
  session.allow("article:*", session.FULL_ACCESS);

  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
