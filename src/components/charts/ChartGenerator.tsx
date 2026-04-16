import { useState } from "react";
import {
  Sparkles,
  Loader2,
  BarChart3,
  BarChart2,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  PieChart as PieIcon,
  ScatterChart as ScatterIcon,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseTable } from "@/lib/parse-table";
import { ArticleChart, type ChartType, type ChartData } from "@/components/charts/ArticleChart";

interface ChartGeneratorProps {
  /** Optional context to help AI suggest a relevant title/source */
  articleTitle?: string;
  articleExcerpt?: string;
  /** Pre-populate the editor with an existing chart (for inline editing). */
  initialChart?: ChartData | null;
  /** Called when admin clicks "Sett inn graf" / "Oppdater graf" */
  onInsert: (chart: ChartData) => void;
  onClose: () => void;
}

const CHART_TYPE_META: Record<ChartType, { label: string; Icon: typeof BarChart3 }> = {
  bar: { label: "Søyle", Icon: BarChart3 },
  stackedBar: { label: "Stablet søyle", Icon: Layers },
  horizontalBar: { label: "Horisontal", Icon: BarChart2 },
  line: { label: "Linje", Icon: LineIcon },
  area: { label: "Areal", Icon: AreaIcon },
  scatter: { label: "Punkt", Icon: ScatterIcon },
  pie: { label: "Kake", Icon: PieIcon },
};

const PLACEHOLDER = `År\tOmsetning\tResultat
2020\t12,5\t1,2
2021\t14,1\t1,8
2022\t16,3\t2,1
2023\t18,9\t2,7
2024\t21,4\t3,4`;

/** Serialize an existing chart's table back to TSV so it can be edited again. */
const chartToTsv = (chart: ChartData): string => {
  const fmt = (v: string | number) =>
    typeof v === "number" ? String(v).replace(".", ",") : String(v ?? "");
  const lines = [chart.headers.join("\t"), ...chart.rows.map((r) => r.map(fmt).join("\t"))];
  return lines.join("\n");
};

export const ChartGenerator = ({
  articleTitle,
  articleExcerpt,
  initialChart,
  onInsert,
  onClose,
}: ChartGeneratorProps) => {
  const isEditing = !!initialChart;
  const initialRaw = initialChart ? chartToTsv(initialChart) : "";
  const [raw, setRaw] = useState(initialRaw);
  const [parsed, setParsed] = useState<ReturnType<typeof parseTable> | null>(
    initialRaw ? parseTable(initialRaw) : null,
  );
  const [loading, setLoading] = useState(false);
  const [chart, setChart] = useState<ChartData | null>(initialChart || null);
  const { toast } = useToast();

  const handleParse = (value: string) => {
    setRaw(value);
    const result = parseTable(value);
    setParsed(result);
    if (chart && result) {
      // Keep current type/labels but refresh data
      setChart({ ...chart, headers: result.headers, rows: result.rows });
    }
  };

  const requestSuggestion = async () => {
    if (!parsed) {
      toast({ title: "Mangler data", description: "Lim inn CSV/TSV med minst 2 rader først", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-chart", {
        body: {
          headers: parsed.headers,
          rows: parsed.rows,
          articleTitle,
          articleExcerpt,
        },
      });
      if (error) throw error;
      const s = data?.suggestion;
      if (!s) throw new Error("Ingen forslag mottatt");
      setChart({
        type: s.chartType,
        title: s.title || "",
        subtitle: s.subtitle || "",
        source: s.source || "Kilde:",
        xAxisLabel: s.xAxisLabel || "",
        yAxisLabel: s.yAxisLabel || "",
        headers: parsed.headers,
        rows: parsed.rows,
      });
      toast({ title: "Forslag generert", description: s.reasoning || "Sjekk og juster før innsetting" });
    } catch (err: any) {
      toast({ title: "Feil", description: err.message || "Kunne ikke generere forslag", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateChart = (patch: Partial<ChartData>) => {
    if (!chart) return;
    setChart({ ...chart, ...patch });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="chart-data" className="text-sm font-medium">
          Lim inn data (CSV, TSV eller fra Excel/Sheets)
        </Label>
        <Textarea
          id="chart-data"
          value={raw}
          onChange={(e) => handleParse(e.target.value)}
          placeholder={PLACEHOLDER}
          className="mt-1.5 font-mono text-xs min-h-[140px]"
        />
        {parsed && (
          <p className="mt-1 text-xs text-muted-foreground">
            {parsed.rowCount} rader × {parsed.columnCount} kolonner · skilletegn:{" "}
            {parsed.delimiter === "\t" ? "tab" : parsed.delimiter === ";" ? "semikolon" : "komma"}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" onClick={requestSuggestion} disabled={loading || !parsed} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Analyserer..." : chart ? "Generer nytt forslag" : "Foreslå visualisering"}
        </Button>
      </div>

      {chart && (
        <div className="space-y-3 border-t border-border pt-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Diagramtype</Label>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(CHART_TYPE_META) as ChartType[]).map((t) => {
                const { label, Icon } = CHART_TYPE_META[t];
                const active = chart.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateChart({ type: t })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="chart-title" className="text-xs text-muted-foreground">Tittel</Label>
              <Input id="chart-title" value={chart.title} onChange={(e) => updateChart({ title: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="chart-source" className="text-xs text-muted-foreground">Kilde</Label>
              <Input id="chart-source" value={chart.source} onChange={(e) => updateChart({ source: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="chart-x" className="text-xs text-muted-foreground">X-akse-etikett</Label>
              <Input id="chart-x" value={chart.xAxisLabel || ""} onChange={(e) => updateChart({ xAxisLabel: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="chart-y" className="text-xs text-muted-foreground">Y-akse-etikett</Label>
              <Input id="chart-y" value={chart.yAxisLabel || ""} onChange={(e) => updateChart({ yAxisLabel: e.target.value })} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="chart-subtitle" className="text-xs text-muted-foreground">Undertittel (valgfritt)</Label>
              <Input id="chart-subtitle" value={chart.subtitle || ""} onChange={(e) => updateChart({ subtitle: e.target.value })} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Forhåndsvisning</Label>
            <div className="rounded-lg bg-muted/30 p-2">
              <ArticleChart data={chart} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Avbryt</Button>
            <Button type="button" onClick={() => { onInsert(chart); onClose(); }}>
              {isEditing ? "Oppdater graf" : "Sett inn graf"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
