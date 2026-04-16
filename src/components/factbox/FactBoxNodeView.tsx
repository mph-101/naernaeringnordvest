import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Pencil, Trash2 } from "lucide-react";
import { FactBox, decodeFactBox } from "./FactBox";

/**
 * In-editor view for a Nær Næring fact box. Renders the live preview and
 * dispatches a `nn-factbox-edit` DOM event when the user wants to edit it,
 * mirroring the chart-figure pattern.
 */
export const FactBoxNodeView = ({ node, getPos, editor, deleteNode }: NodeViewProps) => {
  const encoded = (node.attrs as Record<string, string>)["data-factbox"] || "";
  const data = decodeFactBox(encoded);

  const requestEdit = () => {
    if (!data) return;
    const pos = typeof getPos === "function" ? getPos() : null;
    editor.view.dom.dispatchEvent(
      new CustomEvent("nn-factbox-edit", {
        detail: { data, pos, encoded },
        bubbles: true,
      }),
    );
  };

  return (
    <NodeViewWrapper
      as="div"
      data-nn-factbox-wrapper="true"
      className="relative my-6 group"
      contentEditable={false}
    >
      {data ? (
        <button
          type="button"
          onClick={requestEdit}
          className="block w-full text-left rounded-xl ring-1 ring-transparent hover:ring-primary/40 focus:outline-none focus:ring-primary/60 transition-shadow cursor-pointer"
          title="Klikk for å redigere faktaboksen"
        >
          <FactBox data={data} />
        </button>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Kunne ikke lese faktaboks. Slett blokken og legg inn på nytt.
        </div>
      )}

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {data && (
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
          title="Fjern faktaboks fra artikkelen"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </NodeViewWrapper>
  );
};
