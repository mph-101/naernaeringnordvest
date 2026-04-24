import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "./ImageUpload";
import { Loader2, FlaskConical, BarChart3, Trash2 } from "lucide-react";

interface VariantRow {
  id: string;
  variant_key: string;
  title: string | null;
  image_url: string | null;
  active: boolean;
}

interface VariantStat {
  variant_key: string;
  impressions: number;
  unique_sessions: number;
  completions: number;
  completion_rate: number | null;
}

interface Props {
  articleId: string;
  baselineTitle: string;
  baselineImage: string | null;
}

/**
 * A/B-test panel for an article. Stores a single "B" variant with an
 * alternative title and/or hero image. Live readers are randomly assigned
 * a variant and impressions/completions are aggregated below.
 */
export const ArticleVariantsManager = ({ articleId, baselineTitle, baselineImage }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [variant, setVariant] = useState<VariantRow | null>(null);
  const [draft, setDraft] = useState<{ title: string; image_url: string }>({ title: "", image_url: "" });
  const [stats, setStats] = useState<VariantStat[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("article_variants")
        .select("id, variant_key, title, image_url, active")
        .eq("article_id", articleId)
        .eq("variant_key", "B")
        .maybeSingle();
      if (cancelled) return;
      setVariant(data ?? null);
      setDraft({ title: data?.title ?? "", image_url: data?.image_url ?? "" });

      const { data: statRows } = await supabase.rpc("article_variant_stats", { _article_id: articleId });
      if (!cancelled && Array.isArray(statRows)) {
        setStats(statRows as VariantStat[]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const handleSave = async () => {
    const trimmedTitle = draft.title.trim();
    const trimmedImage = draft.image_url.trim();
    if (!trimmedTitle && !trimmedImage) {
      toast({
        title: "Variant B er tom",
        description: "Fyll inn enten en alternativ tittel eller et bilde",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        article_id: articleId,
        variant_key: "B",
        title: trimmedTitle || null,
        image_url: trimmedImage || null,
        active: true,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("article_variants")
        .upsert(payload, { onConflict: "article_id,variant_key" })
        .select("id, variant_key, title, image_url, active")
        .single();
      if (error) throw error;
      setVariant(data);
      toast({ title: "Lagret", description: "Variant B er aktiv for nye lesere" });
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStop = async () => {
    if (!variant) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("article_variants")
        .delete()
        .eq("id", variant.id);
      if (error) throw error;
      setVariant(null);
      setDraft({ title: "", image_url: "" });
      toast({ title: "Stoppet", description: "A/B-testen er fjernet" });
    } catch (err: any) {
      toast({ title: "Feil", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const statByKey = (key: string) => stats.find((s) => s.variant_key === key);
  const statA = statByKey("A");
  const statB = statByKey("B");
  const winner = (() => {
    if (!statA || !statB) return null;
    if (statA.impressions < 30 || statB.impressions < 30) return null;
    const a = statA.completion_rate ?? 0;
    const b = statB.completion_rate ?? 0;
    if (Math.abs(a - b) < 1) return "tie";
    return a > b ? "A" : "B";
  })();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-accent" />
        <h3 className="font-semibold text-sm">A/B-testing av tittel og bilde</h3>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Definer en alternativ tittel og/eller hovedbilde. Lesere får tilfeldig
        tildelt variant A (originalen) eller variant B, og fullføringsrate
        sammenlignes under.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Laster…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Variant A (original)</div>
              <div className="text-sm font-medium line-clamp-2">{baselineTitle || "(uten tittel)"}</div>
              {baselineImage && (
                <img src={baselineImage} alt="Variant A" className="w-full aspect-video object-cover rounded-lg" />
              )}
            </div>

            <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-accent">Variant B</div>
              <div>
                <Label className="text-xs">Alternativ tittel</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="La stå tom for å beholde originalen"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Alternativt bilde</Label>
                <ImageUpload
                  value={draft.image_url}
                  onChange={(url) => setDraft((d) => ({ ...d, image_url: url }))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
              {variant ? "Oppdater variant B" : "Start A/B-test"}
            </Button>
            {variant && (
              <Button size="sm" variant="outline" onClick={handleStop} disabled={saving}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Stopp test
              </Button>
            )}
          </div>

          {(statA || statB) && (
            <div className="rounded-xl border border-border/60 bg-background p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <BarChart3 className="w-3.5 h-3.5" /> Resultater
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["A", "B"] as const).map((key) => {
                  const stat = statByKey(key);
                  return (
                    <div
                      key={key}
                      className={`rounded-lg p-3 text-sm border ${
                        winner === key
                          ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/20"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="font-semibold mb-1 flex items-center gap-2">
                        Variant {key}
                        {winner === key && <span className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">vinner</span>}
                      </div>
                      <dl className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between"><dt>Visninger</dt><dd className="font-medium text-foreground">{stat?.impressions ?? 0}</dd></div>
                        <div className="flex justify-between"><dt>Unike økter</dt><dd className="font-medium text-foreground">{stat?.unique_sessions ?? 0}</dd></div>
                        <div className="flex justify-between"><dt>Fullført</dt><dd className="font-medium text-foreground">{stat?.completions ?? 0}</dd></div>
                        <div className="flex justify-between"><dt>Fullføringsrate</dt><dd className="font-medium text-foreground">{stat?.completion_rate != null ? `${stat.completion_rate}%` : "—"}</dd></div>
                      </dl>
                    </div>
                  );
                })}
              </div>
              {winner === "tie" && (
                <p className="text-xs text-muted-foreground">Variantene presterer omtrent likt så langt.</p>
              )}
              {winner === null && (
                <p className="text-xs text-muted-foreground">Trenger minst 30 visninger per variant før vi utpeker en vinner.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
