import { useState } from "react";
import { Headphones, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAudioPlayer, type QueueArticle } from "@/hooks/useAudioPlayer";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function DailyEditionCTA() {
  const { language, region } = useTheme();
  const player = useAudioPlayer();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isNo = language === "no";

  const handleStart = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-edition", {
        body: { regionSlug: region ?? undefined },
      });
      if (error) throw error;
      if (!data?.articles?.length) {
        toast.message(isNo ? "Ingen nye saker akkurat nå" : "No new stories right now");
        return;
      }
      if (!data.hasVoiceSupport) {
        toast.message(isNo
          ? "Lyd-modus aktiveres så snart redaksjonens stemme-abonnement er på plass."
          : "Audio mode will be activated once the editorial voice subscription is in place.");
        return;
      }
      const queue: QueueArticle[] = data.articles.map((a: any) => ({
        id: a.id,
        title: a.title,
        excerpt: a.excerpt,
        author: a.author,
        image_url: a.image_url,
        premium: a.premium,
        region_slug: a.region_slug,
      }));
      player.startQueue(queue, 0);
      navigate("/lytt");
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke starte dagens utgave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 pt-6">
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/15 via-card to-primary/10 p-5 text-left transition-all hover:shadow-md hover:border-accent/50 disabled:opacity-60"
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            {loading ? (
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            ) : (
              <Headphones className="w-5 h-5 text-accent" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline text-lg font-semibold text-headline">
              {isNo ? "Hør dagens utgave" : "Listen to today's edition"}
            </p>
            <p className="text-sm text-muted-foreground font-body mt-0.5">
              {isNo
                ? "AI-leste sammendrag i journalistenes egne stemmer. Hopp over saker du ikke vil høre."
                : "AI-read summaries in the journalists' own voices. Skip stories you don't want to hear."}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
