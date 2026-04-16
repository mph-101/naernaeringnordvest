import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Pencil, Trash2 } from "lucide-react";
import { ArticleChart, type ChartData } from "./ArticleChart";

const decodeChart = (encoded: string): ChartData | null => {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    if (!parsed.headers || !parsed.rows) return null;
    return parsed as ChartData;
  } catch {
    return null;
  }
};

/**
 * In-editor view for a Nær Næring chart figure. Renders a live preview of
 * the chart and exposes Edit / Delete affordances. Clicking "Rediger" or
 * the chart itself dispatches a custom DOM event picked up by RichTextEditor,
 * which surfaces it to the page-level ArticleEditor.
 */
export const ChartFigureView = ({ node, getPos, editor, deleteNode }: NodeViewProps) => {
  const encoded = (node.attrs as Record<string, string>)["data-chart"] || "";
  const chart = decodeChart(encoded);

  const requestEdit = () => {
    if (!chart) return;
    const pos = typeof getPos === "function" ? getPos() : null;
    const detail = { chart, pos, encoded };
    editor.view.dom.dispatchEvent(
      new CustomEvent("nn-chart-edit", { detail, bubbles: true }),
    );
  };

  return (
    <NodeViewWrapper
      as="div"
      data-nn-chart-wrapper="true"
      className="relative my-6 group"
      contentEditable={false}
    >
      {chart ? (
        <button
          type="button"
          onClick={requestEdit}
          className="block w-full text-left rounded-xl ring-1 ring-transparent hover:ring-primary/40 focus:outline-none focus:ring-primary/60 transition-shadow"
          title="Klikk for å redigere grafen"
        >
          <ArticleChart data={chart} />
        </button>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Kunne ikke lese graf-data. Slett blokken og legg inn på nytt.
        </div>
      )}

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {chart && (
          <button
            type="button"
            onClick={requestEdit}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/90 backdrop-blur border border-border text-xs font-medium text-foreground shadow-sm hover:bg-background"
          >
            <Pencil className="w-3 h-3" />
            Rediger
          </button>
        )}
        <button
          type="button"
          onClick={() => deleteNode()}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/90 backdrop-blur border border-border text-xs font-medium text-destructive shadow-sm hover:bg-destructive/10"
          title="Slett graf"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </NodeViewWrapper>
  );
};
