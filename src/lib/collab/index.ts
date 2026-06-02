import { createLiveblocksCollab } from "./liveblocks";
import type { CollabHandle } from "./types";

export type { CollabHandle, CollabUser } from "./types";

/**
 * Single swap-point for the collaboration transport.
 *
 * Today: Liveblocks (hosted). To migrate to self-hosted Hocuspocus, change the
 * one line below to `createHocuspocusCollab(roomId)` — the editor, hooks and
 * components above are transport-agnostic and need no changes. Document state
 * survives the cutover because it is persisted to our own `yjs_snapshots` table.
 */
export function createCollabProvider(roomId: string): CollabHandle {
  return createLiveblocksCollab(roomId);
}
