import { createClient, type Client } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import * as Y from "yjs";
import type { CollabHandle } from "./types";

/**
 * Liveblocks transport for collaborative editing.
 *
 * This is the ONLY file that imports `@liveblocks/*`. To move to a self-hosted
 * Hocuspocus backend, add a sibling `hocuspocus.ts` exporting the same
 * `createLiveblocksCollab`-shaped function and switch the import in ./index.ts.
 */

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    // Auth is delegated to our Next route, which verifies the Supabase JWT and
    // role before minting a Liveblocks session token. No public key in the client.
    client = createClient({ authEndpoint: "/api/liveblocks-auth" });
  }
  return client;
}

export function createLiveblocksCollab(roomId: string): CollabHandle {
  const doc = new Y.Doc();
  const { room, leave } = getClient().enterRoom(roomId);
  const yProvider = new LiveblocksYjsProvider(room, doc);

  const whenSynced = new Promise<void>((resolve) => {
    if (yProvider.synced) {
      resolve();
      return;
    }
    yProvider.once("synced", () => resolve());
  });

  return {
    doc,
    provider: yProvider,
    whenSynced,
    destroy() {
      yProvider.destroy();
      leave();
      doc.destroy();
    },
  };
}
