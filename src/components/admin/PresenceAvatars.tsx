import { useEffect, useState } from "react";

/**
 * Minimal awareness surface needed for presence — satisfied by both the
 * Liveblocks Yjs provider and a future Hocuspocus provider (both expose a
 * y-protocols-style Awareness). Kept structural so PresenceAvatars stays
 * transport-agnostic.
 */
interface PresenceAwareness {
  getStates(): Map<number, { user?: { name?: string; color?: string } }>;
  on(event: "change", cb: () => void): void;
  off(event: "change", cb: () => void): void;
}

interface PresentUser {
  clientId: number;
  name: string;
  color: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Colored avatar stack of the other people currently editing this article.
 * Renders nothing when you're alone. Updates live as people join/leave via the
 * Yjs awareness `change` event.
 */
export function PresenceAvatars({
  awareness: awarenessRaw,
  localClientId,
}: {
  // `unknown` because the transport's Awareness class differs (Liveblocks vs
  // Hocuspocus); we narrow to the structural surface we need.
  awareness: unknown;
  localClientId: number | null;
}) {
  const [users, setUsers] = useState<PresentUser[]>([]);

  useEffect(() => {
    const awareness = awarenessRaw as PresenceAwareness | null;
    if (!awareness) return;

    const update = () => {
      const seen = new Set<string>();
      const list: PresentUser[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === localClientId) return;
        const user = state?.user;
        if (!user?.name) return;
        // One avatar per person even if they have the article open twice.
        const dedupeKey = `${user.name}|${user.color ?? ""}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
        list.push({ clientId, name: user.name, color: user.color || "#888" });
      });
      setUsers(list);
    };

    update();
    awareness.on("change", update);
    return () => awareness.off("change", update);
  }, [awarenessRaw, localClientId]);

  if (!users.length) return null;

  return (
    <div className="flex items-center gap-2" aria-label="Hvem redigerer nå">
      <div className="flex -space-x-2">
        {users.map((u) => (
          <div
            key={u.clientId}
            title={u.name}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[11px] font-semibold text-white shadow-sm"
            style={{ backgroundColor: u.color }}
          >
            {initials(u.name)}
          </div>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {users.length === 1 ? "redigerer også nå" : "redigerer også nå"}
      </span>
    </div>
  );
}
