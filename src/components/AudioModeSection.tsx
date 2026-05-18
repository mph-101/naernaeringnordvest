import { useEffect, useState } from "react";
import { Headphones, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AudioModeSection({ userId, isNo }: { userId: string; isNo: boolean }) {
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("audio_mode_enabled")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setEnabled(data.audio_mode_enabled ?? true);
      setLoaded(true);
    })();
  }, [userId]);

  const save = async (next: boolean) => {
    setEnabled(next);
    const { error } = await supabase
      .from("profiles")
      .update({ audio_mode_enabled: next })
      .eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(isNo ? "Lagret" : "Saved");
  };

  if (!loaded) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Headphones className="w-4 h-4 text-accent" />
        <h3 className="font-headline text-lg font-semibold text-headline">
          {isNo ? "Lyd-modus" : "Audio mode"}
        </h3>
      </div>
      <p className="text-sm text-muted-foreground font-body mb-5">
        {isNo
          ? "Vis «Hør dagens utgave» og lydspilleren i appen."
          : "Show \"Listen to today's edition\" and the audio player in the app."}
      </p>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-subhead font-medium text-foreground">
            {isNo ? "Aktiver lyd-modus" : "Enable audio mode"}
          </p>
          <p className="text-xs text-muted-foreground font-body mt-1">
            {isNo
              ? "AI-leste sammendrag i journalistenes egne stemmer."
              : "AI-read summaries in the journalists' own voices."}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={save} />
      </div>
    </div>
  );
}
