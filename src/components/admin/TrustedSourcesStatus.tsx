import { useEffect, useState } from "react";
import {
  Loader2, Globe, Rss, FileText, Database, CheckCircle2, AlertCircle,
  RefreshCw, Search, ChevronDown, ChevronRight, ExternalLink, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SourceType = "url" | "rss" | "document" | "api";

interface TrustedSource {
  id: string;
  name: string;
  source_type: SourceType;
  url: string | null;
  storage_path: string | null;
  active: boolean;
  priority: number;
  refresh_interval_hours: number;
  last_indexed_at: string | null;
  last_index_error: string | null;
  created_at: string;
}

interface SourceStat {
  source: TrustedSource;
  chunkCount: number;
  latestChunkAt: string | null;
  isStale: boolean;
}

interface ChunkRow {
  id: string;
  title: string | null;
  content: string;
  source_url: string | null;
  published_at: string | null;
  chunk_index: number;
}

interface SearchHit {
  document_id: string;
  source_id: string;
  source_name: string;
  source_url: string | null;
  source_type: string;
  title: string | null;
  content: string;
  published_at: string | null;
  priority: number;
  rank: number;
}

const TYPE_ICON: Record<SourceType, any> = {
  url: Globe, rss: Rss, document: FileText, api: Database,
};

const TYPE_LABEL: Record<SourceType, string> = {
  url: "Nettside", rss: "RSS", document: "Dokument", api: "API",
};

export const TrustedSourcesStatus = () => {
  const [stats, setStats] = useState<SourceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [chunkCache, setChunkCache] = useState<Record<string, ChunkRow[]>>({});
  const [chunkLoading, setChunkLoading] = useState<string | null>(null);

  // Query test
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: sources, error } = await supabase
      .from("trusted_sources")
      .select("*")
      .order("priority", { ascending: false })
      .order("name");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Fetch chunk counts + latest chunk timestamp per source in one go
    const ids = (sources || []).map((s) => s.id);
    let countsBySource: Record<string, { count: number; latest: string | null }> = {};
    if (ids.length > 0) {
      const { data: docs } = await supabase
        .from("trusted_source_documents")
        .select("source_id, created_at")
        .in("source_id", ids);
      for (const d of docs || []) {
        const rec = countsBySource[d.source_id] || { count: 0, latest: null };
        rec.count += 1;
        if (!rec.latest || (d.created_at && d.created_at > rec.latest)) {
          rec.latest = d.created_at;
        }
        countsBySource[d.source_id] = rec;
      }
    }

    const now = Date.now();
    const out: SourceStat[] = (sources || []).map((s: any) => {
      const c = countsBySource[s.id] || { count: 0, latest: null };
      const lastIndexed = s.last_indexed_at ? new Date(s.last_indexed_at).getTime() : 0;
      const stalenessMs = (s.refresh_interval_hours || 24) * 3600 * 1000;
      const isStale = s.source_type !== "api" && (!lastIndexed || now - lastIndexed > stalenessMs * 1.5);
      return {
        source: s as TrustedSource,
        chunkCount: c.count,
        latestChunkAt: c.latest,
        isStale,
      };
    });
    setStats(out);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reindex = async (id: string) => {
    setReindexing(id);
    try {
      const { data, error } = await supabase.functions.invoke("index-trusted-source", {
        body: { source_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Indeksert: ${data?.inserted ?? 0} biter`);
      // Invalidate cached chunks for this source
      setChunkCache((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (e: any) {
      toast.error(`Indeksering feilet: ${e.message}`);
    } finally {
      setReindexing(null);
    }
  };

  const toggleExpand = async (id: string) => {
    const isOpen = expanded[id];
    setExpanded((p) => ({ ...p, [id]: !isOpen }));
    if (!isOpen && !chunkCache[id]) {
      setChunkLoading(id);
      const { data, error } = await supabase
        .from("trusted_source_documents")
        .select("id, title, content, source_url, published_at, chunk_index")
        .eq("source_id", id)
        .order("chunk_index", { ascending: true })
        .limit(5);
      if (!error) {
        setChunkCache((p) => ({ ...p, [id]: (data || []) as ChunkRow[] }));
      }
      setChunkLoading(null);
    }
  };

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc("search_trusted_sources", {
        query_text: q,
        match_count: 10,
      });
      if (error) throw error;
      setHits((data || []) as SearchHit[]);
    } catch (e: any) {
      toast.error(`Søk feilet: ${e.message}`);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const okCount = stats.filter((s) => !s.source.last_index_error && s.chunkCount > 0).length;
  const errCount = stats.filter((s) => s.source.last_index_error).length;
  const emptyCount = stats.filter((s) => !s.source.last_index_error && s.chunkCount === 0 && s.source.source_type !== "api").length;
  const staleCount = stats.filter((s) => s.isStale && !s.source.last_index_error).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="OK" value={okCount} tone="success" icon={CheckCircle2} />
        <SummaryCard label="Feil" value={errCount} tone="danger" icon={AlertCircle} />
        <SummaryCard label="Tomme" value={emptyCount} tone="warning" icon={AlertCircle} />
        <SummaryCard label="Utdaterte" value={staleCount} tone="warning" icon={Clock} />
      </div>

      {/* Test query */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-subhead font-semibold text-headline">Test henting</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Kjør et fritekstsøk mot indekserte kilder — samme funksjon som chatboten bruker.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="f.eks. boligpriser oslo"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm font-body"
          />
          <button
            onClick={runSearch}
            disabled={searching || !query.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-subhead disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Søk
          </button>
        </div>

        {hits !== null && (
          <div className="mt-4">
            {hits.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Ingen treff.</p>
            ) : (
              <ul className="space-y-2">
                {hits.map((h) => {
                  const Icon = TYPE_ICON[h.source_type as SourceType] || Globe;
                  return (
                    <li key={h.document_id} className="border border-border rounded-lg p-3 bg-background">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-subhead text-muted-foreground truncate">
                            {h.source_name}
                          </span>
                          <span className="text-xs text-muted-foreground">· rank {h.rank.toFixed(3)}</span>
                        </div>
                        {h.source_url && (
                          <a
                            href={h.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 flex-shrink-0"
                          >
                            Åpne <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {h.title && <p className="text-sm font-subhead text-headline">{h.title}</p>}
                      <p className="text-xs text-muted-foreground line-clamp-3 mt-1 font-body">{h.content}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Per-source status */}
      <div className="space-y-2">
        <h3 className="font-subhead font-semibold text-headline">Status per kilde</h3>
        {stats.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            Ingen kilder å vise.
          </div>
        ) : (
          stats.map((stat) => {
            const s = stat.source;
            const Icon = TYPE_ICON[s.source_type];
            const isOpen = !!expanded[s.id];
            const chunks = chunkCache[s.id];
            const status = s.last_index_error
              ? { label: "Feil", tone: "danger" as const }
              : s.source_type === "api"
              ? { label: "Live (ikke indeksert)", tone: "neutral" as const }
              : stat.chunkCount === 0
              ? { label: "Tom", tone: "warning" as const }
              : stat.isStale
              ? { label: "Utdatert", tone: "warning" as const }
              : { label: "OK", tone: "success" as const };

            return (
              <div
                key={s.id}
                className={`bg-card border rounded-xl ${
                  status.tone === "danger" ? "border-destructive/40" : "border-border"
                } ${!s.active ? "opacity-60" : ""}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => toggleExpand(s.id)}
                      className="flex items-start gap-3 min-w-0 flex-1 text-left"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-subhead font-semibold text-headline">{s.name}</span>
                          <StatusBadge label={status.label} tone={status.tone} />
                          <span className="text-xs text-muted-foreground">
                            {TYPE_LABEL[s.source_type]} · prioritet {s.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{stat.chunkCount} biter</span>
                          {s.last_indexed_at ? (
                            <span>· sist indeksert {new Date(s.last_indexed_at).toLocaleString("no-NO")}</span>
                          ) : s.source_type !== "api" ? (
                            <span>· aldri indeksert</span>
                          ) : null}
                          {!s.active && <span>· deaktivert</span>}
                        </div>
                        {s.last_index_error && (
                          <p className="text-xs text-destructive mt-2 font-mono break-all">
                            {s.last_index_error}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-muted rounded-lg"
                          title="Åpne original"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {s.source_type !== "api" && (
                        <button
                          onClick={() => reindex(s.id)}
                          disabled={reindexing === s.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded-lg hover:bg-muted disabled:opacity-50"
                          title="Test ved å hente og indeksere på nytt"
                        >
                          {reindexing === s.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Test
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 ml-7 border-l-2 border-border pl-4">
                      {chunkLoading === s.id ? (
                        <div className="py-3 text-xs text-muted-foreground inline-flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" /> Laster bitene…
                        </div>
                      ) : !chunks || chunks.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">
                          {s.source_type === "api"
                            ? "API-kilder indekseres ikke; brukes direkte ved spørring."
                            : "Ingen indekserte biter. Trykk Test for å hente."}
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {chunks.map((c) => (
                            <li key={c.id} className="text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-muted-foreground">#{c.chunk_index}</span>
                                {c.title && (
                                  <span className="font-subhead text-headline truncate">{c.title}</span>
                                )}
                                {c.source_url && (
                                  <a
                                    href={c.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <p className="text-muted-foreground line-clamp-2 font-body">{c.content}</p>
                            </li>
                          ))}
                          {stat.chunkCount > chunks.length && (
                            <li className="text-xs text-muted-foreground italic">
                              … og {stat.chunkCount - chunks.length} til
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({
  label, value, tone, icon: Icon,
}: { label: string; value: number; tone: "success" | "danger" | "warning"; icon: any }) => {
  const toneClasses = {
    success: "text-green-600 bg-green-500/10",
    danger: "text-destructive bg-destructive/10",
    warning: "text-amber-600 bg-amber-500/10",
  }[tone];
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneClasses}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-2xl font-headline font-semibold text-headline leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
};

const StatusBadge = ({ label, tone }: { label: string; tone: "success" | "danger" | "warning" | "neutral" }) => {
  const cls = {
    success: "bg-green-500/15 text-green-700 dark:text-green-400",
    danger: "bg-destructive/15 text-destructive",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    neutral: "bg-secondary text-secondary-foreground",
  }[tone];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
  );
};
