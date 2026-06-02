import type * as Y from "yjs";

/**
 * Backend-agnostic handle for a collaborative editing session.
 *
 * Everything above this interface (the tiptap editor, the React components,
 * the `collab_enabled` switch) consumes ONLY this shape — never a
 * Liveblocks-specific type. Swapping Liveblocks for a self-hosted Hocuspocus
 * backend later means rewriting `createCollabProvider` (see ./index.ts) and
 * nothing else.
 */
export interface CollabHandle {
  /** The shared Yjs document the editor binds to via the Collaboration extension. */
  doc: Y.Doc;
  /**
   * Minimal provider surface the CollaborationCaret extension needs.
   * Both LiveblocksYjsProvider and HocuspocusProvider expose `.awareness`, but
   * with structurally different Awareness classes, so we keep it transport-neutral
   * (`unknown`). The caret extension types `provider` as `any` and just reads it.
   */
  provider: { awareness: unknown };
  /** Resolves once the first sync from the backend completes (or immediately if already synced). */
  whenSynced: Promise<void>;
  /** Tear down the connection and free resources. */
  destroy(): void;
}

/** Identity shown on remote cursors/carets. */
export interface CollabUser {
  name: string;
  color: string;
}
