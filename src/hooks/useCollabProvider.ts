import { useCallback, useEffect, useState } from "react";
import { createCollabProvider, type CollabHandle } from "@/lib/collab";
import { supabase } from "@/integrations/supabase/client";

/**
 * Opens a collaborative editing session for one article and tears it down on
 * unmount or when the room changes. Returns `null` until the connection is
 * created (and while disabled), so callers can fall back to the plain editor.
 *
 * The room id is namespaced per article: `article:<id>`.
 */
export function useCollabProvider(
  articleId: string | null | undefined,
  enabled: boolean,
): CollabHandle | null {
  const [handle, setHandle] = useState<CollabHandle | null>(null);

  // Current Supabase access token, fetched fresh on every (re)auth so the
  // backend can verify the user. The app stores its session in localStorage.
  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  useEffect(() => {
    if (!enabled || !articleId) {
      setHandle(null);
      return;
    }

    let active = true;
    let created: CollabHandle | null = null;

    // Guard against any transport/network error so a failed room never crashes
    // the editor — the component falls back to the non-collaborative editor.
    try {
      created = createCollabProvider(`article:${articleId}`, getToken);
      if (active) {
        setHandle(created);
      } else {
        created.destroy();
      }
    } catch (err) {
      console.error("[collab] failed to open room", err);
      setHandle(null);
    }

    return () => {
      active = false;
      setHandle(null);
      created?.destroy();
    };
  }, [articleId, enabled, getToken]);

  return handle;
}
