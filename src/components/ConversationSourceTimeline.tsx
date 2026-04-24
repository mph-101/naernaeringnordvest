import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Newspaper,
  ShieldCheck,
  ExternalLink,
  Quote,
  Clock,
  Rss,
  Database,
  FileText as FileTextIcon,
  Globe,
  MessageSquare,
} from "lucide-react";
import type { ArticleSource, TrustedSource } from "@/lib/articles-chat";

interface AssistantTurn {
  /** Stable id for the assistant message. */
  id: string;
  /** The user's question that produced this answer (for context labels). */
  question: string;
  /** The assistant response text — used to count inline citations. */
  content: string;
  sources?: ArticleSource[];
  trustedSources?: TrustedSource[];
}

interface ConversationSourceTimelineProps {
  turns: AssistantTurn[];
}

/** Counts of inline citations like `[1]` / `[1, 3]` per source-number for one turn. */
function countCitations(content: string): Map<number, number> {
  const counts = new Map<number, number>();
  if (!content) return counts;
  const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    for (const raw of m[1].split(",")) {
      const n = Number(raw.trim());
      if (Number.isFinite(n)) counts.set(n, (counts.get(n) ?? 0) + 1);
    }
  }
  return counts;
}

/** Stable identity for a source across turns (numbers are per-turn). */
function articleKey(s: ArticleSource): string {
  return `internal:${s.id}`;
}
function trustedKey(s: TrustedSource): string {
  // Prefer URL, fall back to source name + title to dedupe rss/api items.
  return `trusted:${s.source_url || `${s.source_name}|${s.title || ""}`}`;
}

interface AggregatedRow {
  key: string;
  kind: "internal" | "trusted";
  title: string;
  meta?: string;
  href?: string;
  source_type?: string;
  /** Total inline citations across the whole conversation. */
  totalCites: number;
  /** How many assistant turns surfaced this source. */
  appearances: number;
  /** How many turns explicitly cited it. */
  citingTurns: number;
}

const TRUSTED_TYPE_ICON: Record<string, typeof Rss> = {
  rss: Rss,
  api: Database,
  document: FileTextIcon,
};

/**
 * Aggregates source usage across every assistant response in a conversation
 * so the user can see at a glance which sources the AI is leaning on most.
 */
export const ConversationSourceTimeline = ({ turns }: ConversationSourceTimelineProps) => {
  const { rows, totalCitations, totalSources } = useMemo(() => {
    const map = new Map<string, AggregatedRow>();
    let totalCitations = 0;

    for (const turn of turns) {
      const counts = countCitations(turn.content);
      const turnKeys = new Set<string>();
      const citedTurnKeys = new Set<string>();

      for (const s of turn.sources ?? []) {
        const key = articleKey(s);
        turnKeys.add(key);
        const cites = counts.get(s.n) ?? 0;
        if (cites > 0) citedTurnKeys.add(key);
        totalCitations += cites;
        const existing = map.get(key);
        if (existing) {
          existing.totalCites += cites;
        } else {
          map.set(key, {
            key,
            kind: "internal",
            title: s.title,
            meta: s.author || undefined,
            href: `/article/${s.id}`,
            totalCites: cites,
            appearances: 0,
            citingTurns: 0,
          });
        }
      }

      for (const t of turn.trustedSources ?? []) {
        const key = trustedKey(t);
        turnKeys.add(key);
        const cites = counts.get(t.n) ?? 0;
        if (cites > 0) citedTurnKeys.add(key);
        totalCitations += cites;
        const existing = map.get(key);
        if (existing) {
          existing.totalCites += cites;
        } else {
          map.set(key, {
            key,
            kind: "trusted",
            title: t.title || t.source_name,
            meta: t.source_name,
            href: t.source_url || undefined,
            source_type: t.source_type,
            totalCites: cites,
            appearances: 0,
            citingTurns: 0,
          });
        }
      }

      // Increment per-turn counters (each source counted once per turn).
      for (const k of turnKeys) {
        const row = map.get(k);
        if (row) row.appearances += 1;
      }
      for (const k of citedTurnKeys) {
        const row = map.get(k);
        if (row) row.citingTurns += 1;
      }
    }

    const rows = Array.from(map.values()).sort((a, b) => {
      if (b.totalCites !== a.totalCites) return b.totalCites - a.totalCites;
      if (b.appearances !== a.appearances) return b.appearances - a.appearances;
      return a.title.localeCompare(b.title);
    });

    return { rows, totalCitations, totalSources: rows.length };
  }, [turns]);

  const maxCites = rows.reduce((m, r) => Math.max(m, r.totalCites), 0);

  if (turns.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground font-body">
        Tidslinjen fyller seg opp etter hvert som du stiller spørsmål.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground font-body">
        Ingen kilder er hentet inn i denne samtalen ennå.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard icon={<MessageSquare className="w-4 h-4" />} label="Svar" value={turns.length} />
        <SummaryCard icon={<ShieldCheck className="w-4 h-4" />} label="Unike kilder" value={totalSources} />
        <SummaryCard icon={<Quote className="w-4 h-4" />} label="Siteringer" value={totalCitations} />
      </div>

      {/* Ranked sources */}
      <div>
        <div className="flex items-center gap-1.5 mb-3 text-xs font-subhead font-medium text-muted-foreground uppercase tracking-wide">
          <Clock className="w-3.5 h-3.5" />
          <span>Mest brukte kilder</span>
        </div>
        <ol className="space-y-2">
          {rows.map((row, idx) => (
            <RankedSourceRow key={row.key} rank={idx + 1} row={row} maxCites={maxCites} />
          ))}
        </ol>
      </div>
    </div>
  );
};

const SummaryCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) => (
  <div className="bg-card border border-border rounded-lg px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-subhead">
      {icon}
      <span>{label}</span>
    </div>
    <div className="font-headline text-2xl font-semibold text-headline mt-0.5">{value}</div>
  </div>
);

interface RankedSourceRowProps {
  rank: number;
  row: AggregatedRow;
  maxCites: number;
}

const RankedSourceRow = ({ rank, row, maxCites }: RankedSourceRowProps) => {
  const KindIcon = row.kind === "internal" ? Newspaper : TRUSTED_TYPE_ICON[row.source_type ?? ""] ?? Globe;
  const barWidth = maxCites > 0 ? Math.max(4, (row.totalCites / maxCites) * 100) : 0;

  const titleEl = row.href ? (
    row.kind === "internal" ? (
      <Link
        to={row.href}
        className="font-headline font-semibold text-sm text-headline hover:text-primary transition-colors break-words"
      >
        {row.title}
      </Link>
    ) : (
      <a
        href={row.href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-headline font-semibold text-sm text-headline hover:text-primary transition-colors break-words inline-flex items-baseline gap-1"
        title={row.href}
      >
        {row.title}
        <ExternalLink className="w-3 h-3 self-center shrink-0" />
      </a>
    )
  ) : (
    <span className="font-headline font-semibold text-sm text-headline break-words">{row.title}</span>
  );

  return (
    <li className="bg-card border border-border rounded-lg px-3 py-2.5">
      <div className="flex items-start gap-3">
        <span className="font-mono text-xs text-muted-foreground shrink-0 w-6 pt-0.5 tabular-nums">
          #{rank}
        </span>
        <KindIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          {titleEl}
          <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {row.meta && <span>{row.meta}</span>}
            {row.meta && <span aria-hidden>·</span>}
            <span>
              {row.appearances} svar{row.appearances === 1 ? "" : ""}
            </span>
            {row.citingTurns > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>
                  sitert i {row.citingTurns} av {row.appearances}
                </span>
              </>
            )}
          </div>
          <div
            className="mt-2 h-1 rounded-full bg-muted overflow-hidden"
            aria-hidden
          >
            <div
              className={
                row.totalCites > 0 ? "h-full bg-accent" : "h-full bg-muted-foreground/20"
              }
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-subhead font-medium tabular-nums ${
            row.totalCites > 0
              ? "bg-accent/10 text-accent"
              : "bg-muted text-muted-foreground"
          }`}
          title={
            row.totalCites > 0
              ? `Sitert ${row.totalCites} ${row.totalCites === 1 ? "gang" : "ganger"} totalt`
              : "Hentet som kontekst — ikke sitert"
          }
        >
          <Quote className="w-2.5 h-2.5" />
          {row.totalCites}×
        </span>
      </div>
    </li>
  );
};