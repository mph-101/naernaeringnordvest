import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const BRREG_BASE = "https://data.brreg.no";

// Throttle to avoid hammering BRREG (~5 req/s).
const DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Compare two role arrays and return a delta. Roles are considered equal
// when (type, person, enhet, fratradt) all match — that way returning, name
// changes, or formal stepdown all show up as a diff.
function roleKey(r: any): string {
  const personKey = r.person ? `${r.person.fornavn || ""}|${r.person.etternavn || ""}` : "";
  const enhetKey = r.enhet ? `enhet:${r.enhet.orgnr}` : "";
  return `${r.type || ""}::${personKey}::${enhetKey}::${r.fratradt ? "F" : ""}`;
}

function diffRoles(oldRoles: any[], newRoles: any[]) {
  const oldKeys = new Set(oldRoles.map(roleKey));
  const newKeys = new Set(newRoles.map(roleKey));
  const added = newRoles.filter((r) => !oldKeys.has(roleKey(r)));
  const removed = oldRoles.filter((r) => !newKeys.has(roleKey(r)));
  return { added, removed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const startedAt = Date.now();

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all unique orgnr that someone follows. No follows = nothing to do.
    const { data: followRows, error: followErr } = await sb
      .from("company_follows")
      .select("orgnr, company_name");

    if (followErr) throw followErr;

    const orgnrToName: Record<string, string | null> = {};
    for (const r of followRows || []) {
      if (!orgnrToName[r.orgnr]) orgnrToName[r.orgnr] = r.company_name;
    }
    const uniqueOrgnrs = Object.keys(orgnrToName);

    if (uniqueOrgnrs.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No follows, nothing to refresh", processed: 0 }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let rolesNotifications = 0;
    let statusNotifications = 0;
    let errors = 0;

    for (const orgnr of uniqueOrgnrs) {
      try {
        // ----- Roles -----
        const rolesRes = await fetch(`${BRREG_BASE}/enhetsregisteret/api/enheter/${orgnr}/roller`, {
          headers: { Accept: "application/json" },
        });

        let freshRoles: any[] = [];
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          const rollegrupper = rolesData?.rollegrupper || [];
          freshRoles = rollegrupper.flatMap((g: any) =>
            (g.roller || []).map((r: any) => ({
              type: g.type?.kode || "",
              typeBeskrivelse: g.type?.beskrivelse || "",
              person:
                r.person && (r.person.fornavn || r.person.navn?.fornavn)
                  ? {
                      fornavn: r.person.fornavn || r.person.navn?.fornavn || "",
                      etternavn: r.person.etternavn || r.person.navn?.etternavn || "",
                    }
                  : null,
              enhet: r.enhet
                ? {
                    orgnr: r.enhet.organisasjonsnummer,
                    navn: Array.isArray(r.enhet.navn) ? r.enhet.navn[0] : r.enhet.navn,
                  }
                : null,
              fratradt: r.fratradt || false,
            }))
          );
        }

        // Compare with cache
        const { data: cachedRolesRow } = await sb
          .from("company_roles_cache")
          .select("roles")
          .eq("orgnr", orgnr)
          .maybeSingle();

        const oldRoles: any[] = (cachedRolesRow?.roles as any[]) || [];
        const isFirstSnapshot = !cachedRolesRow;
        const { added, removed } = diffRoles(oldRoles, freshRoles);

        // Upsert cache
        await sb
          .from("company_roles_cache")
          .upsert(
            { orgnr, roles: freshRoles, fetched_at: new Date().toISOString() },
            { onConflict: "orgnr" }
          );

        // Only emit notifications when we have a previous snapshot to compare against
        if (!isFirstSnapshot && (added.length > 0 || removed.length > 0)) {
          const { data: followers } = await sb
            .from("company_follows")
            .select("user_id, company_name")
            .eq("orgnr", orgnr);

          if (followers && followers.length > 0) {
            const inserts = followers.map((f: any) => ({
              user_id: f.user_id,
              type: "roles_changed",
              orgnr,
              company_name: f.company_name || orgnrToName[orgnr],
              payload: { added, removed },
            }));
            const { error: insErr } = await sb.from("notifications").insert(inserts);
            if (!insErr) rolesNotifications += inserts.length;
          }
        }

        // ----- Status -----
        const statusRes = await fetch(`${BRREG_BASE}/enhetsregisteret/api/enheter/${orgnr}`, {
          headers: { Accept: "application/json" },
        });

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const freshStatus = {
            konkurs: !!statusData?.konkurs,
            konkursdato: statusData?.konkursdato || null,
            under_avvikling: !!statusData?.underAvvikling,
            slettedato: statusData?.slettedato || null,
          };

          const { data: cachedStatusRow } = await sb
            .from("company_status_cache")
            .select("konkurs, konkursdato, under_avvikling, slettedato")
            .eq("orgnr", orgnr)
            .maybeSingle();

          const isFirstStatus = !cachedStatusRow;

          await sb
            .from("company_status_cache")
            .upsert(
              { orgnr, ...freshStatus, fetched_at: new Date().toISOString() },
              { onConflict: "orgnr" }
            );

          if (!isFirstStatus && cachedStatusRow) {
            const changed =
              cachedStatusRow.konkurs !== freshStatus.konkurs ||
              cachedStatusRow.under_avvikling !== freshStatus.under_avvikling ||
              cachedStatusRow.slettedato !== freshStatus.slettedato;

            // Only fan out when something actually toggled
            if (changed) {
              const { data: followers } = await sb
                .from("company_follows")
                .select("user_id, company_name")
                .eq("orgnr", orgnr);

              if (followers && followers.length > 0) {
                const inserts = followers.map((f: any) => ({
                  user_id: f.user_id,
                  type: "status_changed",
                  orgnr,
                  company_name: f.company_name || orgnrToName[orgnr],
                  payload: {
                    konkurs: freshStatus.konkurs,
                    konkursdato: freshStatus.konkursdato,
                    under_avvikling: freshStatus.under_avvikling,
                    slettedato: freshStatus.slettedato,
                    previous: {
                      konkurs: cachedStatusRow.konkurs,
                      under_avvikling: cachedStatusRow.under_avvikling,
                      slettedato: cachedStatusRow.slettedato,
                    },
                  },
                }));
                const { error: insErr } = await sb.from("notifications").insert(inserts);
                if (!insErr) statusNotifications += inserts.length;
              }
            }
          }
        }

        processed++;
        await sleep(DELAY_MS);
      } catch (e) {
        errors++;
        processed++;
        console.error(`refresh-roles-and-status: error for ${orgnr}:`, e);
        await sleep(DELAY_MS);
      }
    }

    const durationMs = Date.now() - startedAt;

    const summary = {
      ok: true,
      total_companies: uniqueOrgnrs.length,
      processed,
      roles_notifications: rolesNotifications,
      status_notifications: statusNotifications,
      errors,
      duration_ms: durationMs,
      duration_sec: Math.round(durationMs / 1000),
    };

    console.log("refresh-roles-and-status:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refresh-roles-and-status fatal:", e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        duration_ms: Date.now() - startedAt,
      }),
      {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
