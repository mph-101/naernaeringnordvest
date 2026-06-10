// Klon en journaliststemme i ElevenLabs Instant Voice Cloning.
// Input: { authorId: string, sampleStoragePath: string }
// Krever admin/editor-rolle.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return json({ error: "ELEVENLABS_API_KEY mangler. Be Magnus om å legge inn nøkkelen i Lovable Cloud først." }, 503);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Ikke innlogget" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Ikke innlogget" }, 401);

    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => ["admin", "editor"].includes(r.role));
    if (!allowed) return json({ error: "Krever admin/editor-rolle" }, 403);

    const body = await req.json().catch(() => ({}));
    const { authorId, sampleStoragePath } = body;
    if (!authorId || !sampleStoragePath) {
      return json({ error: "authorId og sampleStoragePath kreves" }, 400);
    }

    const { data: author, error: aErr } = await admin
      .from("authors").select("id, name, elevenlabs_voice_id").eq("id", authorId).single();
    if (aErr || !author) return json({ error: "Forfatter ikke funnet" }, 404);

    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("audio-uploads").download(sampleStoragePath);
    if (dlErr || !fileBlob) return json({ error: `Klarte ikke hente lydprøven: ${dlErr?.message}` }, 400);

    // Hvis forfatter allerede har klonet stemme — slett den først for å unngå opphopning
    if (author.elevenlabs_voice_id) {
      await fetch(`https://api.elevenlabs.io/v1/voices/${author.elevenlabs_voice_id}`, {
        method: "DELETE",
        headers: { "xi-api-key": apiKey },
      }).catch(() => {});
    }

    const formData = new FormData();
    formData.append("name", `NN — ${author.name}`);
    formData.append("description", `Klonet stemme for ${author.name} (Nær Næring)`);
    formData.append("files", fileBlob, "sample.mp3");
    formData.append("remove_background_noise", "true");

    const resp = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: formData,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return json({ error: `ElevenLabs-feil [${resp.status}]: ${errText}` }, 502);
    }
    const result = await resp.json();
    const voiceId = result.voice_id;
    if (!voiceId) return json({ error: "Manglende voice_id i respons" }, 502);

    await admin.from("authors").update({
      elevenlabs_voice_id: voiceId,
      voice_cloned_at: new Date().toISOString(),
      voice_sample_path: sampleStoragePath,
    }).eq("id", authorId);

    return json({ ok: true, voice_id: voiceId });
  } catch (err: any) {
    console.error("clone-author-voice error:", err);
    return json({ error: err.message ?? String(err) }, 500);
  }
});

