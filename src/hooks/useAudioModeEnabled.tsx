import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isFeatureEnabled } from "@/lib/features";

/**
 * Returnerer true hvis lyd-modus skal vises for gjeldende bruker.
 * - Anonyme brukere: alltid på (kan oppdage funksjonen).
 * - Innloggede: respekterer profiles.audio_mode_enabled.
 * - Globalt: respekterer FEATURES.AUDIO_FIRST flag.
 */
export function useAudioModeEnabled() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!isFeatureEnabled("AUDIO_FIRST")) {
      setEnabled(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setEnabled(true);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("audio_mode_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setEnabled(data?.audio_mode_enabled ?? true);
    })();
    return () => { cancelled = true; };
  }, []);

  return enabled;
}
