import { useEffect, useState } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

interface Revision {
  id: string;
  revision_number: number;
  change_note: string | null;
  body_diff_summary: string | null;
  word_count: number;
  changed_by_name: string | null;
  published_at: string;
}

/**
 * Reader-facing transparency log: lists each publish + change note.
 * Hidden if there are no revisions yet.
 */
export function ArticleRevisionLog({ articleId }: { articleId: string }) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [items, setItems] = useState<Revision[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("article_revisions" as any)
        .select("id, revision_number, change_note, body_diff_summary, word_count, changed_by_name, published_at")
        .eq("article_id", articleId)
        .order("revision_number", { ascending: false });
      if (active && data) setItems(data as unknown as Revision[]);
    })();
    return () => { active = false; };
  }, [articleId]);

  if (items.length === 0) return null;

  return (
    <section className="mb-12 rounded-2xl border border-border bg-surface-subtle/60 px-5 py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <History className="w-4 h-4 text-accent" />
          <span className="font-subhead text-sm font-semibold text-foreground">
            {isNo ? "Endringer i saken" : "Changes to this story"}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <ol className="mt-4 space-y-3">
          {items.map((r) => (
            <li key={r.id} className="flex gap-3 text-sm font-body">
              <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-[11px] font-subhead font-bold tabular-nums shrink-0">
                v{r.revision_number}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-foreground/90">
                  {r.change_note?.trim() || (isNo ? "Publisert oppdatering" : "Published update")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(r.published_at).toLocaleString(isNo ? "nb-NO" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
                  {r.changed_by_name ? ` · ${r.changed_by_name}` : ""}
                  {r.body_diff_summary ? ` · ${r.body_diff_summary}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}