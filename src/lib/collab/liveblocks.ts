import { createClient } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import * as Y from "yjs";
import type { CollabHandle } from "./types";

/**
 * Liveblocks transport for collaborative editing.
 *
 * This is the ONLY file that imports `@liveblocks/*`. To move to a self-hosted
 * Hocuspocus backend, add a sibling exporting the same function shape and switch
 * the import in ./index.ts.
 *
 * Auth: the app stores its Supabase session in localStorage (not cookies), so we
 * can't rely on cookie-based server auth. Instead we send the access token as a
 * Bearer header to our Next route, which verifies it and mints a session token.
 */

export type TokenGetter = () => Promise<string | null>;

export function createLiveblocksCollab(roomId: string, getToken: TokenGetter): CollabHandle {
  const client = createClient({
    authEndpoint: async (room) => {
      const token = await getToken();
      const res = await fetch("/api/liveblocks-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ room }),
      });
      if (!res.ok) {
        throw new Error(`Liveblocks auth failed: ${res.status}`);
      }
      return await res.json();
    },
  });

  const doc = new Y.Doc();
  const { room, leave } = client.enterRoom(roomId);
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
