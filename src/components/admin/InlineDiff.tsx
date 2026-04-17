import { useEffect, useMemo, useState, useCallback } from "react";
import { diffWords, type Change } from "diff";
import { Check, X, RotateCcw } from "lucide-react";

interface InlineDiffProps {
  original: string;
  improved: string;
  className?: string;
  /**
   * Called whenever the user accepts/rejects hunks. Receives the resulting
   * plain text composed from the original + currently-accepted changes.
   */
  onResultChange?: (result: string) => void;
}

/** Strip HTML tags but keep block boundaries as line breaks for readable diffing. */
function htmlToPlain(html: string): string {
  return html
    .replace(/<\s*(p|h[1-6]|li|blockquote|br|div)[^>]*>/gi, "\n")
    .replace(/<\/\s*(p|h[1-6]|li|blockquote|div)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * A "hunk" represents one user-actionable change: a removed run, an added run,
 * or a paired replacement (removed followed by added). Unchanged spans are
 * tracked separately and never need a decision.
 */
type Hunk = {
  id: number;
  removed: string; // empty when pure insertion
  added: string; // empty when pure deletion
};

type Segment =
  | { kind: "equal"; value: string }
  | { kind: "hunk"; hunkId: number };

function buildSegments(parts: Change[]): { segments: Segment[]; hunks: Hunk[] } {
  const segments: Segment[] = [];
  const hunks: Hunk[] = [];
  let i = 0;
  let hunkId = 0;
  while (i < parts.length) {
    const p = parts[i];
    if (!p.added && !p.removed) {
      segments.push({ kind: "equal", value: p.value });
      i++;
      continue;
    }
    // Pair adjacent removed+added into a single hunk (replacement).
    let removed = "";
    let added = "";
    if (p.removed) {
      removed = p.value;
      i++;
      if (i < parts.length && parts[i].added) {
        added = parts[i].value;
        i++;
      }
    } else {
      added = p.value;
      i++;
    }
    const id = hunkId++;
    hunks.push({ id, removed, added });
    segments.push({ kind: "hunk", hunkId: id });
  }
  return { segments, hunks };
}

export const InlineDiff = ({
  original,
  improved,
  className = "",
  onResultChange,
}: InlineDiffProps) => {
  const { segments, hunks } = useMemo(() => {
    const a = htmlToPlain(original);
    const b = htmlToPlain(improved);
    return buildSegments(diffWords(a, b));
  }, [original, improved]);

  // Decisions per hunk: true = accept improved, false = reject (keep original).
  // Default: all accepted (matches "Bruk forbedret versjon" baseline).
  const [decisions, setDecisions] = useState<Record<number, boolean>>({});

  // Reset decisions when the diff changes.
  useEffect(() => {
    const initial: Record<number, boolean> = {};
    hunks.forEach((h) => {
      initial[h.id] = true;
    });
    setDecisions(initial);
  }, [hunks]);

  const composed = useMemo(() => {
    return segments
      .map((s) => {
        if (s.kind === "equal") return s.value;
        const h = hunks[s.hunkId];
        const accepted = decisions[h.id] ?? true;
        return accepted ? h.added : h.removed;
      })
      .join("");
  }, [segments, hunks, decisions]);

  useEffect(() => {
    onResultChange?.(composed);
  }, [composed, onResultChange]);

  const setDecision = useCallback((id: number, accepted: boolean) => {
    setDecisions((prev) => ({ ...prev, [id]: accepted }));
  }, []);

  const acceptAll = () => {
    const next: Record<number, boolean> = {};
    hunks.forEach((h) => {
      next[h.id] = true;
    });
    setDecisions(next);
  };
  const rejectAll = () => {
    const next: Record<number, boolean> = {};
    hunks.forEach((h) => {
      next[h.id] = false;
    });
    setDecisions(next);
  };

  const acceptedCount = hunks.filter((h) => decisions[h.id] ?? true).length;

  return (
    <div className={className}>
      {hunks.length > 0 && (
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-muted-foreground font-body">
            {acceptedCount} av {hunks.length} endringer akseptert
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={acceptAll}
              className="text-xs font-subhead px-2 py-1 rounded-md hover:bg-accent/15 text-accent transition-colors"
            >
              Aksepter alle
            </button>
            <button
              type="button"
              onClick={rejectAll}
              className="text-xs font-subhead px-2 py-1 rounded-md hover:bg-destructive/15 text-destructive transition-colors"
            >
              Avvis alle
            </button>
          </div>
        </div>
      )}

      <div className="prose prose-sm max-w-none dark:prose-invert font-body p-3 rounded-lg border border-border bg-background whitespace-pre-wrap leading-relaxed">
        {segments.map((s, i) => {
          if (s.kind === "equal") {
            return <span key={`e-${i}`}>{s.value}</span>;
          }
          const h = hunks[s.hunkId];
          const accepted = decisions[h.id] ?? true;
          return (
            <HunkChip
              key={`h-${h.id}`}
              hunk={h}
              accepted={accepted}
              onAccept={() => setDecision(h.id, true)}
              onReject={() => setDecision(h.id, false)}
            />
          );
        })}
      </div>
    </div>
  );
};

const HunkChip = ({
  hunk,
  accepted,
  onAccept,
  onReject,
}: {
  hunk: Hunk;
  accepted: boolean;
  onAccept: () => void;
  onReject: () => void;
}) => {
  const isPureAdd = !hunk.removed && hunk.added;
  const isPureRemove = hunk.removed && !hunk.added;
  const isReplace = hunk.removed && hunk.added;

  return (
    <span className="group relative inline align-baseline">
      {/* Removed text — strike-through unless rejected (then it's the kept version) */}
      {hunk.removed && (
        <span
          className={
            accepted
              ? "bg-destructive/15 text-foreground/60 line-through rounded-sm px-0.5"
              : "bg-muted text-foreground rounded-sm px-0.5"
          }
          title={accepted ? "Vil bli fjernet" : "Beholdt (avvist endring)"}
        >
          {hunk.removed}
        </span>
      )}
      {/* Added text — highlighted unless rejected */}
      {hunk.added && (
        <span
          className={
            accepted
              ? "bg-accent/25 text-foreground rounded-sm px-0.5"
              : "bg-muted/50 text-foreground/40 line-through rounded-sm px-0.5"
          }
          title={accepted ? "Vil bli lagt til" : "Avvist forslag"}
        >
          {hunk.added}
        </span>
      )}
      {/* Inline action buttons */}
      <span
        className="inline-flex items-center gap-0.5 align-middle ml-1 opacity-60 group-hover:opacity-100 transition-opacity print:hidden"
        contentEditable={false}
      >
        {accepted ? (
          <button
            type="button"
            onClick={onReject}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-background border border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors"
            title={
              isPureAdd
                ? "Avvis: ikke legg til"
                : isPureRemove
                ? "Avvis: behold original"
                : "Avvis: behold original"
            }
            aria-label="Avvis endring"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onAccept}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-background border border-border hover:bg-accent/15 hover:border-accent/40 hover:text-accent transition-colors"
            title={
              isReplace
                ? "Aksepter erstatning"
                : isPureAdd
                ? "Aksepter: legg til"
                : "Aksepter: fjern"
            }
            aria-label="Aksepter endring"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
      </span>
    </span>
  );
};
