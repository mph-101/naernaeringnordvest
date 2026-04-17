import { useEditor, EditorContent, Extension, Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ChartFigureView } from "@/components/charts/ChartFigureView";
import { FactBoxNodeView } from "@/components/factbox/FactBoxNodeView";
import type { ChartData } from "@/components/charts/ArticleChart";
import type { FactBoxData } from "@/components/factbox/FactBox";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  BarChart3,
  BookOpen,
  Undo,
  Redo,
  Code,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export interface ProofreadHighlight {
  /** Unique id used to dispatch accept/reject events back to the parent. */
  id: string;
  /** The exact original text to mark in the editor. */
  text: string;
  /** Suggested replacement text shown inline next to the original. */
  suggestion?: string;
  /** Short rationale shown as a tooltip on the inline chip. */
  reason?: string;
  category?: string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImageUpload?: () => void;
  onInsertChart?: () => void;
  onInsertFactBox?: () => void;
  /** Called when the user clicks an existing chart in the editor.
   *  `pos` is the ProseMirror position of the figure node, used to replace it. */
  onEditChart?: (chart: ChartData, pos: number) => void;
  /** Called when the user clicks an existing fact box in the editor. */
  onEditFactBox?: (data: FactBoxData, pos: number) => void;
  /** Called once with the underlying TipTap editor instance, so the parent
   *  can imperatively replace nodes (e.g. swap an existing chart for an updated one). */
  editorRef?: (editor: ReturnType<typeof useEditor> | null) => void;
  placeholder?: string;
  className?: string;
  highlights?: ProofreadHighlight[];
}

const highlightPluginKey = new PluginKey("proofread-highlights");

const HighlightExtension = Extension.create<{ highlights: ProofreadHighlight[] }>({
  name: "proofreadHighlights",
  addOptions() {
    return { highlights: [] };
  },
  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: highlightPluginKey,
        props: {
          decorations: (state) => {
            const items: ProofreadHighlight[] = ext.options.highlights || [];
            if (!items.length) return DecorationSet.empty;
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              const text = node.text;
              for (const h of items) {
                if (!h.text) continue;
                let idx = 0;
                while ((idx = text.indexOf(h.text, idx)) !== -1) {
                  const from = pos + idx;
                  const to = from + h.text.length;
                  decorations.push(
                    Decoration.inline(from, to, {
                      class: `proofread-highlight proofread-${h.category || "stil"}`,
                    }),
                  );
                  idx += h.text.length;
                }
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

/**
 * Atom-block node that preserves Nær Næring chart figures verbatim
 * (`<figure data-nn-chart="true" data-chart="<base64>">`). The editor
 * shows a simple placeholder; the public article view re-renders the
 * real chart component from the encoded JSON.
 */
const ChartFigureNode = Node.create({
  name: "chartFigure",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      "data-chart": { default: null },
      title: { default: "" },
      source: { default: "" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure[data-nn-chart]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const data = el.getAttribute("data-chart") || "";
          let title = "";
          let source = "";
          try {
            const json = decodeURIComponent(escape(atob(data)));
            const parsed = JSON.parse(json);
            title = parsed.title || "";
            source = parsed.source || "";
          } catch {
            // ignore
          }
          return { "data-chart": data, title, source };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { title, source, ...rest } = HTMLAttributes as Record<string, string>;
    return [
      "figure",
      mergeAttributes(rest, { "data-nn-chart": "true" }),
      ["p", {}, ["strong", {}, title || "Graf"], ` — ${source || ""}`],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ChartFigureView);
  },
});

/**
 * Atom-block node that preserves Nær Næring fact boxes verbatim
 * (`<aside data-nn-factbox="true" data-factbox="<base64>">`).
 */
const FactBoxNode = Node.create({
  name: "factBox",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      "data-factbox": { default: null },
      title: { default: "" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "aside[data-nn-factbox]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const data = el.getAttribute("data-factbox") || "";
          let title = "";
          try {
            const json = decodeURIComponent(escape(atob(data)));
            const parsed = JSON.parse(json);
            title = parsed.title || "";
          } catch {
            // ignore
          }
          return { "data-factbox": data, title };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { title, ...rest } = HTMLAttributes as Record<string, string>;
    return [
      "aside",
      mergeAttributes(rest, { "data-nn-factbox": "true" }),
      ["p", {}, ["strong", {}, title || "Faktaboks"]],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FactBoxNodeView);
  },
});

export const RichTextEditor = ({
  content,
  onChange,
  onImageUpload,
  onInsertChart,
  onInsertFactBox,
  onEditChart,
  onEditFactBox,
  editorRef,
  placeholder = "Start å skrive...",
  className = "",
  highlights,
}: RichTextEditorProps) => {
  const isInitial = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      HighlightExtension.configure({ highlights: highlights || [] }),
      ChartFigureNode,
      FactBoxNode,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes (e.g. proofreading fixes, AI improvements,
  // translation) into the editor. Skip while the editor is focused so we
  // don't yank the user's caret while they're typing.
  useEffect(() => {
    if (!editor) return;
    if (isInitial.current) {
      isInitial.current = false;
      if (content && editor.getHTML() !== content) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
      return;
    }
    if (editor.getHTML() === content) return;
    if (editor.isFocused) return;
    editor.commands.setContent(content || "", { emitUpdate: false });
  }, [editor, content]);

  // Update highlights dynamically without recreating the editor
  useEffect(() => {
    if (!editor) return;
    const ext = editor.extensionManager.extensions.find((e) => e.name === "proofreadHighlights");
    if (ext) {
      ext.options.highlights = highlights || [];
      // Force decoration recompute
      editor.view.dispatch(editor.state.tr.setMeta("proofreadHighlightsUpdate", true));
    }
  }, [editor, highlights]);

  // Listen for chart-edit requests dispatched from the ChartFigureView node-view
  useEffect(() => {
    if (!editor || !onEditChart) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { chart: ChartData; pos: number | null };
      if (detail?.chart && typeof detail.pos === "number") {
        onEditChart(detail.chart, detail.pos);
      }
    };
    const el = editor.view.dom;
    el.addEventListener("nn-chart-edit", handler as EventListener);
    return () => el.removeEventListener("nn-chart-edit", handler as EventListener);
  }, [editor, onEditChart]);

  // Listen for fact-box edit requests
  useEffect(() => {
    if (!editor || !onEditFactBox) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { data: FactBoxData; pos: number | null };
      if (detail?.data && typeof detail.pos === "number") {
        onEditFactBox(detail.data, detail.pos);
      }
    };
    const el = editor.view.dom;
    el.addEventListener("nn-factbox-edit", handler as EventListener);
    return () => el.removeEventListener("nn-factbox-edit", handler as EventListener);
  }, [editor, onEditFactBox]);

  // Expose the editor to the parent for imperative operations
  useEffect(() => {
    editorRef?.(editor || null);
    return () => editorRef?.(null);
  }, [editor, editorRef]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const ToolButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className={`border border-input rounded-lg overflow-hidden bg-background ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-input bg-muted/30">
        <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Angre">
          <Undo className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Gjør om">
          <Redo className="w-4 h-4" />
        </ToolButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Overskrift 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Overskrift 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Overskrift 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Fet"
        >
          <Bold className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Kursiv"
        >
          <Italic className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Understrek"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Gjennomstreking"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Kode"
        >
          <Code className="w-4 h-4" />
        </ToolButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Punktliste"
        >
          <List className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Nummerert liste"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Sitat"
        >
          <Quote className="w-4 h-4" />
        </ToolButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Venstrejuster"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Sentrer"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Høyrejuster"
        >
          <AlignRight className="w-4 h-4" />
        </ToolButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolButton onClick={addLink} active={editor.isActive("link")} title="Lenke">
          <LinkIcon className="w-4 h-4" />
        </ToolButton>
        {onImageUpload && (
          <ToolButton onClick={onImageUpload} title="Sett inn bilde">
            <ImageIcon className="w-4 h-4" />
          </ToolButton>
        )}
        {onInsertChart && (
          <ToolButton onClick={onInsertChart} title="Sett inn graf">
            <BarChart3 className="w-4 h-4" />
          </ToolButton>
        )}
        {onInsertFactBox && (
          <ToolButton onClick={onInsertFactBox} title="Sett inn faktaboks">
            <BookOpen className="w-4 h-4" />
          </ToolButton>
        )}
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[300px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
};
