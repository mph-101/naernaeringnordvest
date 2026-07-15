import { useState } from "react";
import { Loader2, X, UserPlus, Mail, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AppRole } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const ROLE_OPTIONS: { id: AppRole; label: string }[] = [
  { id: "reader", label: "Leser" },
  { id: "subscriber", label: "Abonnent" },
  { id: "contributor", label: "Bidragsyter" },
  { id: "business", label: "Bedriftsbruker" },
  { id: "journalist", label: "Journalist" },
  { id: "editor", label: "Redaktør" },
  { id: "admin", label: "Admin" },
];

export const CreateUserDialog = ({ open, onClose, onCreated }: Props) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [sendInvite, setSendInvite] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>(["reader"]);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const toggleRole = (role: AppRole) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const reset = () => {
    setEmail("");
    setDisplayName("");
    setPassword("");
    setSendInvite(true);
    setRoles(["reader"]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        email: email.trim(),
        display_name: displayName.trim() || undefined,
        roles,
        send_invite: sendInvite,
      };
      if (!sendInvite) payload.password = password;

      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: payload,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({
        title: sendInvite ? "Invitasjon sendt" : "Bruker opprettet",
        description: (data as any)?.warning ?? email,
      });
      reset();
      onCreated();
      onClose();
    } catch (err: any) {
      toast({
        title: "Kunne ikke opprette bruker",
        description: err.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h3 className="font-headline text-lg font-semibold text-headline">
              Opprett ny bruker
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Lukk"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-1">
              E-post
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="navn@firma.no"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-1">
              Visningsnavn (valgfritt)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Kari Nordmann"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <label
              className={`flex items-start gap-3 p-3 cursor-pointer ${
                sendInvite ? "bg-primary/5" : ""
              }`}
            >
              <input
                type="radio"
                name="mode"
                checked={sendInvite}
                onChange={() => setSendInvite(true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-body text-foreground">
                  <Mail className="w-3.5 h-3.5" /> Send invitasjons-e-post
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Brukeren får en lenke for å sette eget passord
                </p>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 p-3 border-t border-border cursor-pointer ${
                !sendInvite ? "bg-primary/5" : ""
              }`}
            >
              <input
                type="radio"
                name="mode"
                checked={!sendInvite}
                onChange={() => setSendInvite(false)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-body text-foreground">
                  <KeyRound className="w-3.5 h-3.5" /> Sett passord nå
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  E-post bekreftes automatisk
                </p>
                {!sendInvite && (
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minst 8 tegn"
                    minLength={8}
                    required={!sendInvite}
                    className="mt-2 w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
              Roller
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_OPTIONS.map((r) => {
                const active = roles.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className={`px-3 py-1 rounded-full text-xs font-subhead border transition-all ${
                      active
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[0.6875rem] text-muted-foreground mt-1.5">
              «Leser» tildeles automatisk. Velg flere roller ved behov.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm font-subhead text-muted-foreground hover:text-foreground rounded-lg"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={busy || !email}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-subhead bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {sendInvite ? "Send invitasjon" : "Opprett bruker"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
