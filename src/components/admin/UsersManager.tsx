import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Search, Shield, UserCircle2, Check, X, BookOpen, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  roles: AppRole[];
  last_seen_at: string | null;
  articles_read: number;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "aldri";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "nå";
  if (min < 60) return `${min} min siden`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} t siden`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} d siden`;
  return new Date(iso).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

const ALL_ROLES: { id: AppRole; label: string; description: string; tone: string }[] = [
  { id: "reader", label: "Leser", description: "Gratis konto, tilgang til offentlig innhold", tone: "bg-muted text-muted-foreground" },
  { id: "subscriber", label: "Abonnent", description: "Tilgang til premium-artikler", tone: "bg-accent/20 text-accent-foreground" },
  { id: "contributor", label: "Bidragsyter", description: "Kan sende inn tips og utkast", tone: "bg-primary/15 text-primary" },
  { id: "journalist", label: "Journalist", description: "Skriver og publiserer egne artikler", tone: "bg-primary/25 text-primary" },
  { id: "editor", label: "Redaktør", description: "Redigerer alt innhold, ser all analyse", tone: "bg-secondary text-secondary-foreground" },
  { id: "admin", label: "Admin", description: "Full tilgang, inkl. brukerstyring", tone: "bg-destructive/15 text-destructive" },
];

export const UsersManager = () => {
  const { userId: meId } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_list_users", {
      _search: term ? term : null,
      _limit: 200,
    });
    if (error) {
      toast({ title: "Kunne ikke laste brukere", description: error.message, variant: "destructive" });
      setUsers([]);
    } else {
      setUsers((data as AdminUser[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load("");
  }, [load]);

  // Debounced search
  useEffect(() => {
    const id = setTimeout(() => load(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search, load]);

  const toggleRole = async (user: AdminUser, role: AppRole, currentlyHas: boolean) => {
    const key = `${user.user_id}:${role}`;
    setBusy(key);
    try {
      const fn = currentlyHas ? "admin_revoke_role" : "admin_grant_role";
      const { error } = await (supabase.rpc as any)(fn, {
        _user_id: user.user_id,
        _role: role,
      });
      if (error) throw error;
      // Optimistically update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id
            ? {
                ...u,
                roles: currentlyHas
                  ? u.roles.filter((r) => r !== role)
                  : Array.from(new Set([...u.roles, role])),
              }
            : u,
        ),
      );
      toast({
        title: currentlyHas ? "Rolle fjernet" : "Rolle tildelt",
        description: `${user.email ?? user.user_id} → ${role}`,
      });
    } catch (err: any) {
      toast({ title: "Endring mislyktes", description: err.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: users.length };
    ALL_ROLES.forEach((r) => {
      c[r.id] = users.filter((u) => u.roles.includes(r.id)).length;
    });
    return c;
  }, [users]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-headline">Brukere</h2>
          <p className="text-sm text-muted-foreground font-body">
            Administrer roller og tilganger. Nye brukere får automatisk «leser».
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-body">
          <span><strong className="text-foreground">{counts.total}</strong> brukere</span>
          {ALL_ROLES.map((r) => (
            <span key={r.id}>
              <strong className="text-foreground">{counts[r.id] ?? 0}</strong> {r.label.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søk på e-post eller navn..."
          className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground font-body text-center py-12">Ingen brukere funnet</p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-4 py-2.5 bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground font-body">
            <div className="col-span-4">Bruker</div>
            <div className="col-span-2">Registrert</div>
            <div className="col-span-6">Roller</div>
          </div>
          <div className="divide-y divide-border">
            {users.map((u) => {
              const isMe = u.user_id === meId;
              return (
                <div key={u.user_id} className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 items-center">
                  <div className="col-span-1 md:col-span-4 min-w-0 flex items-center gap-2">
                    <UserCircle2 className="w-8 h-8 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-body text-sm text-foreground truncate flex items-center gap-2">
                        {u.display_name || u.email || "(ukjent)"}
                        {isMe && (
                          <span className="text-[10px] font-subhead px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">deg</span>
                        )}
                      </div>
                      {u.display_name && u.email && (
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-2 text-xs text-muted-foreground font-body">
                    {new Date(u.created_at).toLocaleDateString("nb-NO", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </div>
                  <div className="col-span-1 md:col-span-6 flex flex-wrap gap-1.5">
                    {ALL_ROLES.map((r) => {
                      const has = u.roles.includes(r.id);
                      const key = `${u.user_id}:${r.id}`;
                      const isBusy = busy === key;
                      const disabled = isBusy || (isMe && r.id === "admin" && has);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleRole(u, r.id, has)}
                          title={
                            disabled && isMe && r.id === "admin"
                              ? "Du kan ikke fjerne din egen admin-rolle"
                              : r.description
                          }
                          className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-subhead transition-all border ${
                            has
                              ? `${r.tone} border-transparent shadow-soft`
                              : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          {isBusy ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : has ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <span className="w-3 h-3 inline-block" />
                          )}
                          {r.label}
                          {has && !disabled && (
                            <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground font-body flex gap-2 items-start">
        <Shield className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="text-foreground font-medium mb-1">Slik virker rollene</p>
          <ul className="space-y-0.5">
            {ALL_ROLES.map((r) => (
              <li key={r.id}><strong className="text-foreground">{r.label}:</strong> {r.description}</li>
            ))}
          </ul>
          <p className="mt-2">Den siste admin-brukeren kan ikke fjernes — det er en innebygd sikring.</p>
        </div>
      </div>
    </div>
  );
};
