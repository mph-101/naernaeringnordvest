import { useRef, useState, useEffect } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
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
 * the chart and exposes Edit / Delete / Move affordances. Clicking "Rediger" or
 * the chart itself dispatches a custom DOM event picked up by RichTextEditor.
 *
 * Move up/down: swaps the chart node with the previous/next top-level block.
 * Drag-and-drop: TipTap's draggable node spec handles native HTML5 drag —
 * the wrapper exposes data-drag-handle so the whole figure can be dragged.
 */
export const ChartFigureView = ({ node, getPos, editor, deleteNode }: NodeViewProps) => {
  const encoded = (node.attrs as Record<string, string>)["data-chart"] || "";
  const chart = decodeChart(encoded);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(false);

  // After a move, the node is re-rendered. We tag the encoded payload in
  // sessionStorage so the freshly mounted view knows to play the animation.
  useEffect(() => {
    if (!encoded) return;
    const key = `nn-chart-just-moved:${encoded.slice(0, 32)}`;
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key);
      setAnimating(true);
      requestAnimationFrame(() => {
        wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      const t = window.setTimeout(() => setAnimating(false), 550);
      return () => window.clearTimeout(t);
    }
  }, [encoded]);

  const requestEdit = () => {
    if (!chart) return;
    const pos = typeof getPos === "function" ? getPos() : null;
    const detail = { chart, pos, encoded };
    editor.view.dom.dispatchEvent(
      new CustomEvent("nn-chart-edit", { detail, bubbles: true }),
    );
  };

  const moveBy = (direction: -1 | 1) => {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (pos == null) return;

    const { state } = editor;
    const { doc, tr } = state;
    const $pos = doc.resolve(pos);
    const parent = $pos.parent;
    const indexInParent = $pos.index();
    const targetIndex = indexInParent + direction;
    if (targetIndex < 0 || targetIndex >= parent.childCount) return;

    const chartNode = node;
    const siblingNode = parent.child(targetIndex);

    let chartStart = 0;
    let siblingStart = 0;
    parent.forEach((_child, offset, i) => {
      if (i === indexInParent) chartStart = offset;
      if (i === targetIndex) siblingStart = offset;
    });

    // Tag this chart so the re-mounted view plays the animation
    sessionStorage.setItem(`nn-chart-just-moved:${encoded.slice(0, 32)}`, "1");

    if (direction === -1) {
      const from = siblingStart;
      const to = chartStart + chartNode.nodeSize;
      tr.replaceWith(from, to, [chartNode, siblingNode]);
    } else {
      const from = chartStart;
      const to = siblingStart + siblingNode.nodeSize;
      tr.replaceWith(from, to, [siblingNode, chartNode]);
    }

    editor.view.dispatch(tr);
    editor.view.focus();
  };

  return (
    <NodeViewWrapper
      as="div"
      ref={wrapperRef}
      data-nn-chart-wrapper="true"
      data-drag-handle
      draggable="true"
      className={`relative my-6 group rounded-xl ${animating ? "animate-chart-move" : ""}`}
      contentEditable={false}
    >
      {chart ? (
        <button
          type="button"
          onClick={requestEdit}
          className="block w-full text-left rounded-xl ring-1 ring-transparent hover:ring-primary/40 focus:outline-none focus:ring-primary/60 transition-shadow cursor-pointer"
          title="Klikk for å redigere grafen — eller dra for å flytte"
        >
          <ArticleChart data={chart} />
        </button>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Kunne ikke lese graf-data. Slett blokken og legg inn på nytt.
        </div>
      )}

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => moveBy(-1)}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-background/90 backdrop-blur border border-border text-foreground shadow-sm hover:bg-background"
          title="Flytt opp"
          aria-label="Flytt graf opp"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => moveBy(1)}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-background/90 backdrop-blur border border-border text-foreground shadow-sm hover:bg-background"
          title="Flytt ned"
          aria-label="Flytt graf ned"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
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
