import { useEditor, EditorContent, Extension, Node, mergeAttributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
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
  Undo,
  Redo,
  Code,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export interface ProofreadHighlight {
  text: string;
  category?: string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImageUpload?: () => void;
  onInsertChart?: () => void;
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
  draggable: false,
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
});

export const RichTextEditor = ({
  content,
  onChange,
  onImageUpload,
  onInsertChart,
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
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content && isInitial.current) {
      isInitial.current = false;
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
    }
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
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[300px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
};
