import { useCallback, useEffect, useRef, type ComponentProps } from "react";
import type { Editor } from "@tiptap/react";
import { RichTextEditor } from "./RichTextEditor";
import { useCollabProvider } from "@/hooks/useCollabProvider";
import { useAuth } from "@/hooks/useAuth";

type Props = Omit<ComponentProps<typeof RichTextEditor>, "collab"> & {
  /** Article id; the collab room is `article:<id>`. */
  articleId: string | null;
  /** Feature flag from `articles.collab_enabled`. */
  collabEnabled: boolean;
};

const CARET_COLORS = [
  "#c2542d", "#2d6b4f", "#1f6f8b", "#8b5cf6", "#d97706",
  "#db2777", "#0891b2", "#65a30d", "#dc2626", "#7c3aed",
];
function colorForUser(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CARET_COLORS[hash % CARET_COLORS.length];
}

/**
 * Drop-in for RichTextEditor that adds real-time collaboration when
 * `collabEnabled` is set. Until the room connects (or if collaboration is off)
 * it renders the plain editor, so editing always works.
 *
 * Seeding: after the first backend sync, if the shared document is still empty,
 * we seed it from the article's stored HTML. Simultaneous first-open by two
 * users could double-seed — cold-start hardening from `yjs_snapshots` is Fase C.
 */
export const CollaborativeRichTextEditor = ({
  articleId,
  collabEnabled,
  content,
  editorRef,
  ...rest
}: Props) => {
  const { user } = useAuth();
  const handle = useCollabProvider(articleId, collabEnabled);
  const editorInstance = useRef<Editor | null>(null);

  const captureEditor = useCallback(
    (ed: Editor | null) => {
      editorInstance.current = ed;
      editorRef?.(ed);
    },
    [editorRef],
  );

  // Seed the shared document once, after first sync, if no one has yet.
  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    void handle.whenSynced.then(() => {
      if (cancelled) return;
      const ed = editorInstance.current;
      if (ed && ed.isEmpty && content) {
        ed.commands.setContent(content, { emitUpdate: false });
      }
    });
    return () => {
      cancelled = true;
    };
    // `content` is read at seed time on purpose; we don't want to re-seed when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  const collab =
    handle && user
      ? {
          doc: handle.doc,
          provider: handle.provider,
          user: {
            name:
              (user.user_metadata?.display_name as string | undefined) ||
              (user.user_metadata?.full_name as string | undefined) ||
              user.email ||
              "Redaktør",
            color: colorForUser(user.id),
          },
        }
      : null;

  // Remount (not just re-render) when collaboration turns on/off so the editor
  // is created once with its final extension set and its view mounts cleanly.
  return (
    <RichTextEditor
      {...rest}
      key={collab ? "collab" : "plain"}
      content={content}
      editorRef={captureEditor}
      collab={collab}
    />
  );
};
