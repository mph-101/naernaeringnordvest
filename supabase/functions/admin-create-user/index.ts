// Admin-only edge function: create a new user (with optional initial roles).
// Uses the service role key. Verifies the caller is an admin via has_role().
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppRole =
  | "admin"
  | "editor"
  | "journalist"
  | "reader"
  | "subscriber"
  | "contributor"
  | "business";

const VALID_ROLES: AppRole[] = [
  "admin",
  "editor",
  "journalist",
  "reader",
  "subscriber",
  "contributor",
  "business",
];

interface Payload {
  email: string;
  password?: string;
  display_name?: string;
  roles?: AppRole[];
  send_invite?: boolean; // if true, send an invite email instead of setting password
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    // Caller-context client to identify the requester
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return json({ error: "Not authenticated" }, 401);
    }
    const callerId = userRes.user.id;

    // Service-role client for privileged checks + user creation
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr) {
      console.error("has_role check failed", roleErr);
      return json({ error: "Role check failed" }, 500);
    }
    if (!isAdmin) {
      return json({ error: "Insufficient privileges" }, 403);
    }

    const body = (await req.json()) as Payload;
    const email = (body.email || "").trim().toLowerCase();
    const display_name = (body.display_name || "").trim() || null;
    const requestedRoles = Array.isArray(body.roles) ? body.roles : [];
    const roles = requestedRoles.filter((r) => VALID_ROLES.includes(r));
    const sendInvite = !!body.send_invite;
    const password = body.password?.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Ugyldig e-postadresse" }, 400);
    }
    if (!sendInvite && (!password || password.length < 8)) {
      return json({ error: "Passord må være minst 8 tegn" }, 400);
    }

    // Create or invite the user
    let newUserId: string | null = null;
    if (sendInvite) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: display_name ? { full_name: display_name } : undefined,
      });
      if (error) {
        console.error("inviteUserByEmail failed", error);
        return json({ error: error.message }, 400);
      }
      newUserId = data.user?.id ?? null;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: display_name ? { full_name: display_name } : undefined,
      });
      if (error) {
        console.error("createUser failed", error);
        return json({ error: error.message }, 400);
      }
      newUserId = data.user?.id ?? null;
    }

    if (!newUserId) {
      return json({ error: "Bruker ble ikke opprettet" }, 500);
    }

    // The handle_new_user() trigger seeds 'reader' role + profile.
    // Insert any additional requested roles.
    const extraRoles = roles.filter((r) => r !== "reader");
    if (extraRoles.length > 0) {
      const rows = extraRoles.map((role) => ({ user_id: newUserId!, role }));
      const { error: roleInsertErr } = await admin
        .from("user_roles")
        .upsert(rows, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (roleInsertErr) {
        console.error("inserting roles failed", roleInsertErr);
        // Non-fatal: user exists; surface a warning
        return json({
          ok: true,
          user_id: newUserId,
          warning: `Bruker opprettet, men rollene kunne ikke tildeles: ${roleInsertErr.message}`,
        });
      }
    }

    return json({ ok: true, user_id: newUserId });
  } catch (e) {
    console.error("admin-create-user fatal", e);
    return json({ error: (e as Error).message || "Ukjent feil" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
