import { createLiveblocksCollab, type TokenGetter } from "./liveblocks";
import type { CollabHandle } from "./types";

export type { CollabHandle, CollabUser } from "./types";
export type { TokenGetter } from "./liveblocks";

/**
 * Single swap-point for the collaboration transport.
 *
 * Today: Liveblocks (hosted). To migrate to self-hosted Hocuspocus, change the
 * one line below to `createHocuspocusCollab(roomId, getToken)` — the editor,
 * hooks and components above are transport-agnostic and need no changes.
 * Document state survives the cutover because it is persisted to our own
 * `yjs_snapshots` table. `getToken` returns the current Supabase access token so
 * the backend can authenticate the user.
 */
export function createCollabProvider(roomId: string, getToken: TokenGetter): CollabHandle {
  return createLiveblocksCollab(roomId, getToken);
}
