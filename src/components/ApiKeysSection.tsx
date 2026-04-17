import { useEffect, useState } from "react";
import { Key, Copy, Trash2, Loader2, Plus, AlertCircle, Check, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  request_count: number;
  expires_at: string | null;
  created_at: string;
}

interface Props {
  isNo: boolean;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/feed-api`;

// Generate a strong key: prefix + 32 url-safe random chars
function generateKey(): { full: string; prefix: string } {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const random = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const full = `nn_live_${random}`;
  return { full, prefix: full.slice(0, 12) };
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const ApiKeysSection = ({ isNo }: Props) => {
  const { hasAnyRole } = useAuth();
  const allowed = hasAnyRole(["subscriber", "admin"]);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const t = isNo
    ? {
        title: "API-tilgang",
        desc: "Hent nyhetsflyten som JSON via vårt REST-API. Inkludert i abonnementet.",
        notAllowed: "API-tilgang er forbeholdt abonnenter. Kontakt redaksjonen for å oppgradere.",
        keys: "Dine nøkler",
        none: "Ingen nøkler ennå.",
        new: "Ny nøkkel",
        namePlaceholder: "Navn (f.eks. 'Min produksjons-server')",
        create: "Opprett nøkkel",
        copy: "Kopier",
        copied: "Kopiert!",
        revoke: "Tilbakekall",
        revokeConfirm: "Tilbakekalle denne nøkkelen? Den kan ikke gjenopprettes.",
        revoked: "Nøkkel tilbakekalt",
        created: "Nøkkel opprettet",
        warning: "Lagre nøkkelen nå — du kan ikke se den igjen.",
        lastUsed: "Sist brukt",
        never: "Aldri",
        requests: "kall",
        viewDocs: "Vis dokumentasjon",
        hideDocs: "Skjul dokumentasjon",
      }
    : {
        title: "API access",
        desc: "Fetch the news feed as JSON via our REST API. Included with your subscription.",
        notAllowed: "API access is for subscribers only. Contact the editorial team to upgrade.",
        keys: "Your keys",
        none: "No keys yet.",
        new: "New key",
        namePlaceholder: "Name (e.g. 'My production server')",
        create: "Create key",
        copy: "Copy",
        copied: "Copied!",
        revoke: "Revoke",
        revokeConfirm: "Revoke this key? It cannot be restored.",
        revoked: "Key revoked",
        created: "Key created",
        warning: "Save the key now — you won't see it again.",
        lastUsed: "Last used",
        never: "Never",
        requests: "calls",
        viewDocs: "Show documentation",
        hideDocs: "Hide documentation",
      };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys" as any)
      .select("id, name, key_prefix, last_used_at, request_count, expires_at, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setKeys((data as unknown as ApiKeyRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (allowed) load();
    else setLoading(false);
  }, [allowed]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error(isNo ? "Skriv inn et navn" : "Enter a name");
      return;
    }
    setCreating(true);
    try {
      const { full, prefix } = generateKey();
      const hash = await sha256Hex(full);
      const { error } = await (supabase.rpc as any)("create_api_key", {
        _name: newName.trim(),
        _key_hash: hash,
        _key_prefix: prefix,
        _expires_at: null,
      });
      if (error) throw error;
      setJustCreated(full);
      setNewName("");
      toast.success(t.created);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm(t.revokeConfirm)) return;
    const { error } = await (supabase.rpc as any)("revoke_api_key", { _id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.revoked);
    load();
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!allowed) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Key className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-headline text-lg font-semibold text-headline">{t.title}</h3>
        </div>
        <div className="flex gap-2 items-start text-sm text-muted-foreground font-body bg-muted/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{t.notAllowed}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Key className="w-5 h-5 text-accent" />
          <h3 className="font-headline text-lg font-semibold text-headline">{t.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground font-body">{t.desc}</p>
      </div>

      {/* Just-created key (one-time reveal) */}
      {justCreated && (
        <div className="border border-accent/40 bg-accent/5 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-subhead text-accent">
            <AlertCircle className="w-4 h-4" />
            {t.warning}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-background px-3 py-2 rounded-md break-all border border-border">
              {justCreated}
            </code>
            <button
              onClick={() => copyKey(justCreated)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-subhead hover:opacity-90 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t.copied : t.copy}
            </button>
          </div>
          <button
            onClick={() => setJustCreated(null)}
            className="text-xs text-muted-foreground underline"
          >
            {isNo ? "Lukk" : "Dismiss"}
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t.namePlaceholder}
          className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-subhead font-medium hover:opacity-90 disabled:opacity-50 transition"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {t.create}
        </button>
      </div>

      {/* List */}
      <div>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-subhead mb-2">
          {t.keys}
        </h4>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body py-2">{t.none}</p>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center gap-3 px-3 py-2.5 bg-background">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-body text-foreground truncate">{k.name}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    {k.key_prefix}…
                  </div>
                </div>
                <div className="hidden sm:block text-right text-xs text-muted-foreground font-body">
                  <div>
                    {k.request_count} {t.requests}
                  </div>
                  <div>
                    {t.lastUsed}:{" "}
                    {k.last_used_at
                      ? new Date(k.last_used_at).toLocaleDateString("nb-NO")
                      : t.never}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="p-2 rounded-md text-destructive hover:bg-destructive/10 transition"
                  title={t.revoke}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Docs */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => setShowDocs((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-subhead text-primary hover:underline"
        >
          <Code className="w-4 h-4" />
          {showDocs ? t.hideDocs : t.viewDocs}
        </button>
        {showDocs && (
          <div className="mt-3 space-y-3 text-xs font-body text-muted-foreground">
            <div>
              <div className="font-semibold text-foreground mb-1">Endpoint</div>
              <code className="block bg-background border border-border rounded px-2 py-1.5 font-mono break-all">
                GET {FUNCTION_URL}
              </code>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-1">
                {isNo ? "Autentisering" : "Authentication"}
              </div>
              <code className="block bg-background border border-border rounded px-2 py-1.5 font-mono break-all">
                Authorization: Bearer nn_live_...
              </code>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-1">
                {isNo ? "Spørringsparametre" : "Query parameters"}
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                <li><code>limit</code> (1–100, default 20)</li>
                <li><code>offset</code> (default 0)</li>
                <li><code>category</code> ({isNo ? "valgfri" : "optional"})</li>
                <li><code>region</code> ({isNo ? "valgfri, slug" : "optional, slug"})</li>
                <li><code>lang</code> (<code>no</code> | <code>en</code>)</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-1">curl</div>
              <code className="block bg-background border border-border rounded px-2 py-1.5 font-mono whitespace-pre-wrap break-all">
{`curl -H "Authorization: Bearer YOUR_KEY" \\
  "${FUNCTION_URL}?limit=10&lang=no"`}
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
