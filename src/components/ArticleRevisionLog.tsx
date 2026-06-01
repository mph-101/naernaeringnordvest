import { useEffect, useState } from "react";
import { History, ChevronDown, ChevronUp, FileText, Pencil, User } from "lucide-react";
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
export function ArticleRevisionLog({
  articleId,
  originalPublishedAt,
  originalAuthor,
}: {
  articleId: string;
  originalPublishedAt?: string | null;
  originalAuthor?: string | null;
}) {
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

  const hasRevisions = items.length > 0;
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString(isNo ? "nb-NO" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isNo ? "nb-NO" : "en-US", { dateStyle: "medium" });

  // Compute correct "first published" and "last edited" dates by comparing
  // article.published_at with the oldest/newest revision timestamps.
  const allDates = items.map((r) => new Date(r.published_at).getTime());
  if (originalPublishedAt) allDates.push(new Date(originalPublishedAt).getTime());
  const firstPublishedDate = allDates.length > 0 ? new Date(Math.min(...allDates)).toISOString() : originalPublishedAt;
  const lastEditedDate = hasRevisions ? new Date(Math.max(...items.map((r) => new Date(r.published_at).getTime()))).toISOString() : null;
  const lastEditor = hasRevisions ? items.reduce((a, b) => new Date(a.published_at) > new Date(b.published_at) ? a : b).changed_by_name : null;

  return (
    <section className="mb-12 rounded-2xl border border-border bg-surface-subtle/60 px-5 py-4">
      <button
        type="button"
        onClick={() => hasRevisions && setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
        disabled={!hasRevisions}
      >
        <span className="flex items-center gap-2.5">
          <History className="w-4 h-4 text-accent" />
          <span className="font-subhead text-sm font-semibold text-foreground">
            {isNo ? "Åpenhet om saken" : "Story transparency"}
          </span>
          {hasRevisions && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {items.length} {isNo ? (items.length === 1 ? "endring" : "endringer") : items.length === 1 ? "edit" : "edits"}
            </span>
          )}
        </span>
        {hasRevisions ? (
          open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : null}
      </button>

      {/* Always-visible summary: published date, last edit, author */}
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-body">
        <div className="flex items-start gap-2">
          <FileText className="w-3.5 h-3.5 text-accent/80 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <dt className="text-muted-foreground">{isNo ? "Publisert" : "Published"}</dt>
            <dd className="text-foreground/90 font-medium">
              {firstPublishedDate ? fmtDateTime(firstPublishedDate) : isNo ? "Ukjent" : "Unknown"}
              {originalAuthor ? ` · ${originalAuthor}` : ""}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Pencil className="w-3.5 h-3.5 text-accent/80 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <dt className="text-muted-foreground">{isNo ? "Sist redigert" : "Last edited"}</dt>
            <dd className="text-foreground/90 font-medium">
              {lastEditedDate ? (
                <>
                  {fmtDateTime(lastEditedDate)}
                  {lastEditor ? ` · ${lastEditor}` : ""}
                </>
              ) : (
                <span className="text-muted-foreground italic font-normal">
                  {isNo ? "Ikke redigert etter publisering" : "Not edited since publication"}
                </span>
              )}
            </dd>
          </div>
        </div>
      </dl>

      {hasRevisions && open && (
        <ol className="mt-4 pt-4 border-t border-border/60 space-y-3">
          {items.map((r) => (
            <li key={r.id} className="flex gap-3 text-sm font-body">
              <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-[11px] font-subhead font-bold tabular-nums shrink-0">
                v{r.revision_number}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-foreground/90">
                  {r.change_note?.trim() || (isNo ? "Publisert oppdatering" : "Published update")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{fmtDateTime(r.published_at)}</span>
                  {r.changed_by_name && (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {r.changed_by_name}
                    </span>
                  )}
                  {r.body_diff_summary && (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/70 tabular-nums">
                      {r.body_diff_summary}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
          {firstPublishedDate && (
            <li className="flex gap-3 text-sm font-body opacity-80">
              <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-[11px] font-subhead font-bold tabular-nums shrink-0">
                v0
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-foreground/90">
                  {isNo ? "Opprinnelig publisering" : "Original publication"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {fmtDate(firstPublishedDate)}
                  {originalAuthor ? ` · ${originalAuthor}` : ""}
                </div>
              </div>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}