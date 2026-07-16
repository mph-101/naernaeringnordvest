import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ExternalLink,
  Rss,
  Database,
  FileText as FileTextIcon,
  Globe,
  Newspaper,
  Quote,
  CircleDashed,
} from "lucide-react";
import type { ArticleSource, TrustedSource } from "@/lib/articles-chat";

interface SourceVerificationLogProps {
  /** The assistant message text — used to count how many times each [n] is cited. */
  content: string;
  /** Internal Nær Næring articles surfaced by the search. */
  sources?: ArticleSource[];
  /** External trusted/curated sources surfaced by the search. */
  trustedSources?: TrustedSource[];
  /** Localised label for the section title (defaults to Norwegian). */
  title?: string;
}

const TRUSTED_TYPE_ICON: Record<string, typeof Rss> = {
  rss: Rss,
  api: Database,
  document: FileTextIcon,
};

/**
 * Renders an audit-style verification log for one assistant response so the
 * user can see exactly which trusted sources or internal records were used to
 * generate the answer — and how often each one was cited inline.
 *
 * - Groups sources by origin (internal articles vs external trusted sources)
 * - Counts inline citations like `[1]` or `[1, 3]` per source
 * - Flags sources that were retrieved as context but never cited
 * - Collapsible to keep the conversation readable
 */
export const SourceVerificationLog = ({
  content,
  sources = [],
  trustedSources = [],
  title = "Kildeverifisering",
}: SourceVerificationLogProps) => {
  const [open, setOpen] = useState(true);

  /** Map of source-number → number of inline citations in the answer text. */
  const citationCounts = useMemo(() => {
    const counts = new Map<number, number>();
    if (!content) return counts;
    const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      for (const raw of match[1].split(",")) {
        const n = Number(raw.trim());
        if (Number.isFinite(n)) counts.set(n, (counts.get(n) ?? 0) + 1);
      }
    }
    return counts;
  }, [content]);

  const totalSources = sources.length + trustedSources.length;
  if (totalSources === 0) return null;

  const citedCount =
    sources.filter((s) => (citationCounts.get(s.n) ?? 0) > 0).length +
    trustedSources.filter((s) => (citationCounts.get(s.n) ?? 0) > 0).length;
  const contextOnlyCount = totalSources - citedCount;

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
          <span className="font-subhead text-sm font-medium text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground truncate">
            {totalSources} {totalSources === 1 ? "kilde" : "kilder"}
            {sources.length > 0 && ` · ${sources.length} intern${sources.length === 1 ? "" : "e"}`}
            {trustedSources.length > 0 && ` · ${trustedSources.length} ekstern${trustedSources.length === 1 ? "" : "e"}`}
            {contextOnlyCount > 0 && ` · ${contextOnlyCount} kun kontekst`}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {sources.length > 0 && (
            <SourceGroup
              icon={<Newspaper className="w-3.5 h-3.5" />}
              label="Interne artikler"
              count={sources.length}
            >
              {sources.map((source) => {
                const cites = citationCounts.get(source.n) ?? 0;
                return (
                  <SourceRow
                    key={`internal-${source.n}-${source.id}`}
                    n={source.n}
                    cites={cites}
                    title={source.title}
                    meta={source.author || undefined}
                    href={`/article/${source.id}`}
                    isInternal
                  />
                );
              })}
            </SourceGroup>
          )}

          {trustedSources.length > 0 && (
            <SourceGroup
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="Eksterne betrodde kilder"
              count={trustedSources.length}
            >
              {trustedSources.map((trusted) => {
                const cites = citationCounts.get(trusted.n) ?? 0;
                const Icon = TRUSTED_TYPE_ICON[trusted.source_type] ?? Globe;
                return (
                  <SourceRow
                    key={`trusted-${trusted.n}`}
                    n={trusted.n}
                    cites={cites}
                    title={trusted.title || trusted.source_name}
                    meta={trusted.source_name}
                    href={trusted.source_url || undefined}
                    leadingIcon={<Icon className="w-3 h-3 text-muted-foreground shrink-0" />}
                  />
                );
              })}
            </SourceGroup>
          )}
        </div>
      )}
    </div>
  );
};

interface SourceGroupProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}

const SourceGroup = ({ icon, label, count, children }: SourceGroupProps) => (
  <div>
    <div className="flex items-center gap-1.5 mb-2 text-xs font-subhead font-medium text-muted-foreground">
      <span className="text-muted-foreground/80">{icon}</span>
      <span>{label}</span>
      <span className="text-muted-foreground/60">({count})</span>
    </div>
    <ol className="space-y-1.5">{children}</ol>
  </div>
);

interface SourceRowProps {
  n: number;
  cites: number;
  title: string;
  meta?: string;
  href?: string;
  isInternal?: boolean;
  leadingIcon?: React.ReactNode;
}

const SourceRow = ({ n, cites, title, meta, href, isInternal, leadingIcon }: SourceRowProps) => {
  const linkClass = "text-primary hover:underline inline-flex items-baseline gap-1 break-words";
  const TitleEl = href ? (
    isInternal ? (
      <Link to={href} className={linkClass}>
        {title}
      </Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass} title={href}>
        {title}
        <ExternalLink className="w-3 h-3 self-center shrink-0" />
      </a>
    )
  ) : (
    <span className="text-foreground break-words">{title}</span>
  );

  return (
    <li className="flex items-baseline gap-2 text-sm leading-relaxed">
      <span className="font-mono text-xs text-muted-foreground shrink-0 w-6">[{n}]</span>
      {leadingIcon && <span className="self-center">{leadingIcon}</span>}
      <div className="flex-1 min-w-0">
        {TitleEl}
        {meta && <span className="text-muted-foreground text-xs"> — {meta}</span>}
      </div>
      <CitationBadge cites={cites} />
    </li>
  );
};

const CitationBadge = ({ cites }: { cites: number }) => {
  if (cites > 0) {
    return (
      <span
        className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.625rem] font-subhead font-medium bg-accent/10 text-accent"
        title={`Sitert ${cites} ${cites === 1 ? "gang" : "ganger"} i svaret`}
      >
        <Quote className="w-2.5 h-2.5" />
        {cites}×
      </span>
    );
  }
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.625rem] font-subhead font-medium bg-muted text-muted-foreground"
      title="Hentet som kontekst, men ikke sitert eksplisitt i svaret"
    >
      <CircleDashed className="w-2.5 h-2.5" />
      Kontekst
    </span>
  );
};