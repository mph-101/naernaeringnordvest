import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Mail, User, Clock, CheckCircle, Eye, XCircle, Lock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TipStatus = "new" | "reviewing" | "followed_up" | "dismissed";

interface Tip {
  id: string;
  journalist_id: string;
  journalist_name: string;
  content: string;
  has_encrypted_email: boolean;
  status: TipStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<TipStatus, string> = {
  new: "Ny",
  reviewing: "Til vurdering",
  followed_up: "Fulgt opp",
  dismissed: "Forkastet",
};

const STATUS_COLORS: Record<TipStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewing: "bg-yellow-100 text-yellow-800",
  followed_up: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-500",
};

export const TipsList = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJournalist, setSelectedJournalist] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TipStatus | "all">("all");
  const { toast } = useToast();

  // Decrypt dialog state
  const [decryptTip, setDecryptTip] = useState<Tip | null>(null);
  const [privateKey, setPrivateKey] = useState("");
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedEmail, setDecryptedEmail] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      // follow_up_email_encrypted is bytea and not yet in the generated types,
      // so the query builder is cast to any (interim pattern, see magnus-todo:
      // regenerate types). We only read whether an encrypted email exists — the
      // ciphertext itself is decrypted server-side via decrypt-tip-email.
      const { data, error } = await (supabase.from("tips") as any)
        .select(
          "id, journalist_id, journalist_name, content, follow_up_email_encrypted, status, reviewed_by, reviewed_at, created_at",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = (data as Array<Record<string, unknown>>) ?? [];
      setTips(
        rows.map((r) => ({
          id: r.id as string,
          journalist_id: r.journalist_id as string,
          journalist_name: r.journalist_name as string,
          content: r.content as string,
          has_encrypted_email: r.follow_up_email_encrypted != null,
          status: r.status as TipStatus,
          reviewed_by: (r.reviewed_by as string | null) ?? null,
          reviewed_at: (r.reviewed_at as string | null) ?? null,
          created_at: r.created_at as string,
        })),
      );
    } catch (error) {
      console.error("Error fetching tips:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDecrypt = (tip: Tip) => {
    setDecryptTip(tip);
    setPrivateKey("");
    setDecryptedEmail(null);
    setDecryptError(null);
  };

  const closeDecrypt = () => {
    setDecryptTip(null);
    setPrivateKey("");
    setDecryptedEmail(null);
    setDecryptError(null);
    setDecrypting(false);
  };

  const runDecrypt = async () => {
    if (!decryptTip || !privateKey.trim()) return;
    setDecrypting(true);
    setDecryptError(null);
    setDecryptedEmail(null);
    try {
      const { data, error } = await supabase.functions.invoke("decrypt-tip-email", {
        body: { tip_id: decryptTip.id, private_key: privateKey.trim() },
      });
      if (error) {
        // Try to surface the edge function's error message.
        let message = "Dekryptering feilet. Sjekk at du limte inn riktig privatnøkkel.";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          }
        } catch {
          /* keep default message */
        }
        setDecryptError(message);
        return;
      }
      if (data?.email) {
        setDecryptedEmail(data.email as string);
      } else {
        setDecryptError("Ingen e-post returnert for dette tipset.");
      }
    } catch {
      setDecryptError("Uventet feil under dekryptering.");
    } finally {
      setDecrypting(false);
    }
  };

  const updateStatus = async (tipId: string, newStatus: TipStatus) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("tips")
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", tipId);

    if (error) {
      toast({ title: "Feil", description: "Kunne ikke oppdatere status.", variant: "destructive" });
      return;
    }

    setTips((prev) =>
      prev.map((t) =>
        t.id === tipId ? { ...t, status: newStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString() } : t
      )
    );
  };

  const journalistMap = new Map<string, string>();
  for (const tip of tips) {
    if (!journalistMap.has(tip.journalist_id)) {
      journalistMap.set(tip.journalist_id, tip.journalist_name);
    }
  }

  const filteredTips = tips.filter((t) => {
    if (selectedJournalist && t.journalist_id !== selectedJournalist) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-headline text-2xl font-semibold text-headline">
          Innkomne tips
        </h2>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "new", "reviewing", "followed_up", "dismissed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {s === "all" ? "Alle" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filter by journalist */}
      {journalistMap.size > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedJournalist(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedJournalist === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            Alle journalister
          </button>
          {[...journalistMap.entries()].map(([id, name]) => (
            <button
              key={id}
              onClick={() => setSelectedJournalist(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedJournalist === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {filteredTips.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-soft">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-headline text-xl font-medium text-headline mb-2">
            Ingen tips ennå
          </h3>
          <p className="text-muted-foreground font-body max-w-md mx-auto">
            Tips sendes via den sikre tipskanalen på team-siden og vises her når de kommer inn.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTips.map((tip) => (
            <div key={tip.id} className={`bg-card rounded-xl p-6 shadow-soft ${tip.status === "dismissed" ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-headline font-body">
                      Til: {tip.journalist_name}
                    </p>
                    <p className="text-sm text-muted-foreground font-body flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(tip.created_at), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[tip.status]}`}>
                    {STATUS_LABELS[tip.status]}
                  </span>
                  {tip.has_encrypted_email && (
                    <button
                      onClick={() => openDecrypt(tip)}
                      title="Tipseren oppga en oppfølgings-e-post (kryptert). Krever privatnøkkel for å lese."
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Lock className="w-4 h-4" />
                      <Mail className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-foreground font-body whitespace-pre-wrap mb-4">
                {tip.content}
              </p>

              {/* Status actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                {tip.status !== "reviewing" && (
                  <button
                    onClick={() => updateStatus(tip.id, "reviewing")}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    Til vurdering
                  </button>
                )}
                {tip.status !== "followed_up" && (
                  <button
                    onClick={() => updateStatus(tip.id, "followed_up")}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Fulgt opp
                  </button>
                )}
                {tip.status !== "dismissed" && (
                  <button
                    onClick={() => updateStatus(tip.id, "dismissed")}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <XCircle className="w-3 h-3" />
                    Forkast
                  </button>
                )}
                {tip.reviewed_at && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Vurdert {format(new Date(tip.reviewed_at), "d. MMM yyyy", { locale: nb })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decrypt follow-up email dialog */}
      <Dialog open={decryptTip !== null} onOpenChange={(open) => !open && closeDecrypt()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dekrypter oppfølgings-e-post</DialogTitle>
            <DialogDescription>
              Tipsernes e-post lagres kryptert (sealed box). Lim inn din private
              dekrypteringsnøkkel for å lese den. Nøkkelen sendes til en sikker
              edge-funksjon og lagres aldri i nettleseren.
            </DialogDescription>
          </DialogHeader>

          {decryptedEmail ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">E-post for dette tipset:</p>
              <a
                href={`mailto:${decryptedEmail}`}
                className="flex items-center gap-2 text-primary font-medium hover:underline break-all"
              >
                <Mail className="w-4 h-4 shrink-0" />
                {decryptedEmail}
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                type="password"
                autoComplete="off"
                placeholder="Privat dekrypteringsnøkkel"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runDecrypt();
                }}
              />
              {decryptError && (
                <p className="text-sm text-destructive">{decryptError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={closeDecrypt} disabled={decrypting}>
                  Avbryt
                </Button>
                <Button onClick={runDecrypt} disabled={decrypting || !privateKey.trim()}>
                  {decrypting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Dekrypter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
