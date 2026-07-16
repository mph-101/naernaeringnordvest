import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUrlParam } from "@/lib/params";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface BusinessAccount {
  id: string;
  company_name: string;
  orgnr: string | null;
  seat_count: number;
  status: string;
  email_domain: string | null;
  domain_verification_token: string | null;
  domain_verified_at: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  owner_user_id: string;
  environment: string;
}

interface Seat {
  id: string;
  email: string;
  user_id: string | null;
  invited_at: string;
  accepted_at: string | null;
  source: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BusinessPanel() {
  const id = getUrlParam();
  const navigate = useNavigate();
  const { userId, isAuthenticated, loading: authLoading } = useAuth();

  const [account, setAccount] = useState<BusinessAccount | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [seatRequestOpen, setSeatRequestOpen] = useState(false);
  const [seatRequestCount, setSeatRequestCount] = useState<number>(5);
  const [seatRequestNote, setSeatRequestNote] = useState("");
  const [seatRequestSubmitting, setSeatRequestSubmitting] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/login?redirect=/abonnement/bedrift/${id ?? ""}`);
    }
  }, [authLoading, isAuthenticated, navigate, id]);

  const loadData = async () => {
    if (!id) return;
    const { data: acc } = await supabase
      .from("business_accounts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    setAccount(acc as BusinessAccount | null);

    const { data: seatRows } = await supabase
      .from("business_seats")
      .select("id, email, user_id, invited_at, accepted_at, source")
      .eq("business_account_id", id)
      .order("invited_at", { ascending: false });
    setSeats((seatRows as Seat[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (id && isAuthenticated) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated]);

  // Realtime updates on seats
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`business-seats:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_seats",
          filter: `business_account_id=eq.${id}`,
        },
        () => loadData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-business-seat", {
        body: { businessAccountId: account.id, email: inviteEmail.trim() },
      });
      if (error || (data as { error?: string })?.error) {
        toast.error((data as { error?: string })?.error ?? error?.message ?? "Kunne ikke invitere");
      } else {
        toast.success(
          (data as { linkedDirectly?: boolean })?.linkedDirectly
            ? "Bruker funnet og lagt til umiddelbart"
            : "Invitasjon opprettet"
        );
        setInviteEmail("");
        loadData();
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveSeat = async (seatId: string) => {
    if (!confirm("Fjern dette setet?")) return;
    const { error } = await supabase.from("business_seats").delete().eq("id", seatId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Sete fjernet");
      loadData();
    }
  };

  const handleVerifyDomain = async () => {
    if (!account) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-business-domain", {
        body: { businessAccountId: account.id },
      });
      if (error) {
        setVerifyResult({ ok: false, message: error.message });
      } else if ((data as { verified?: boolean })?.verified) {
        setVerifyResult({
          ok: true,
          message: (data as { backfilled?: number })?.backfilled
            ? `Verifisert. ${(data as { backfilled: number }).backfilled} eksisterende bruker(e) ble lagt til automatisk.`
            : "Domenet er verifisert.",
        });
        loadData();
      } else {
        setVerifyResult({
          ok: false,
          message:
            (data as { help?: string })?.help ??
            "Fant ikke TXT-record. Sjekk at den er publisert og prøv igjen om noen minutter.",
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          returnUrl: `${window.location.origin}/abonnement/bedrift/${id}`,
        },
      });
      if (error || !(data as { url?: string })?.url) {
        toast.error(error?.message ?? "Kunne ikke åpne fakturaportal");
      } else {
        window.open((data as { url: string }).url, "_blank");
      }
    } finally {
      setOpeningPortal(false);
    }
  };

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} kopiert`);
  };

  const handleSeatRequest = async () => {
    if (!account) return;
    const extra = Math.max(1, Math.floor(seatRequestCount || 0));
    setSeatRequestSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const requesterEmail = userData.user?.email ?? "ukjent";
      const subject = `Forespørsel om flere seter – ${account.company_name}`;
      const bodyLines = [
        `Hei,`,
        ``,
        `Vi ønsker å utvide bedriftsabonnementet vårt på Nær Næring.`,
        ``,
        `Bedrift: ${account.company_name}`,
        account.orgnr ? `Org.nr: ${account.orgnr}` : null,
        `Konto-ID: ${account.id}`,
        `Nåværende seter: ${account.seat_count}`,
        `Brukte seter: ${usedSeats}`,
        `Ønsket antall ekstra seter: ${extra}`,
        ``,
        seatRequestNote.trim() ? `Kommentar:\n${seatRequestNote.trim()}` : null,
        ``,
        `Vennligst send tilbud / bekreftelse til ${requesterEmail}.`,
        ``,
        `Med vennlig hilsen,`,
        requesterEmail,
      ].filter(Boolean) as string[];
      const body = bodyLines.join("\n");

      // Log the request via the existing tip channel so support can follow up server-side.
      try {
        await supabase.functions.invoke("submit-tip", {
          body: {
            journalistId: "salg",
            journalistName: "Salg / Kundeservice",
            content:
              `[Seat-utvidelse]\n` +
              `Bedrift: ${account.company_name} (${account.orgnr ?? "uten org.nr"})\n` +
              `Konto-ID: ${account.id}\n` +
              `Nåværende: ${account.seat_count} seter, brukt: ${usedSeats}\n` +
              `Ønsket ekstra: ${extra}\n` +
              (seatRequestNote.trim() ? `Kommentar: ${seatRequestNote.trim()}\n` : "") +
              `Kontakt: ${requesterEmail}`,
            isAnonymous: false,
            followUpEmail: requesterEmail,
          },
        });
      } catch {
        // Non-blocking: even if logging fails, we still open the mail draft below.
      }

      // Open the user's mail client with a prefilled draft to support.
      const mailto = `mailto:support@naernaering.no?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;

      toast.success("Forespørsel registrert. E-postutkast åpnet.");
      setSeatRequestOpen(false);
      setSeatRequestNote("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Kunne ikke sende forespørsel"
      );
    } finally {
      setSeatRequestSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="font-headline text-2xl font-bold text-headline mb-3">Bedriftskonto ikke funnet</h1>
          <p className="text-muted-foreground font-body mb-6">
            Du har ikke tilgang til denne bedriftskontoen, eller den finnes ikke.
          </p>
          <Button onClick={() => navigate("/profil")} variant="outline">
            Tilbake til profil
          </Button>
        </div>
      </div>
    );
  }

  if (account.owner_user_id !== userId) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="font-headline text-2xl font-bold text-headline mb-3">Ingen tilgang</h1>
          <p className="text-muted-foreground font-body mb-6">
            Bare eier av bedriftskontoen kan administrere seter og fakturering.
          </p>
        </div>
      </div>
    );
  }

  const usedSeats = seats.length;
  const seatPercent = Math.min(100, (usedSeats / Math.max(1, account.seat_count)) * 100);
  const expectedTxt = account.domain_verification_token
    ? `naer-naering-verify=${account.domain_verification_token}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      {account.environment === "sandbox" && <PaymentTestModeBanner />}

      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Tilbake
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-bold text-headline mb-1">{account.company_name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground font-body">
                {account.orgnr && <span>Org.nr {account.orgnr}</span>}
                <Badge variant={account.status === "active" || account.status === "trialing" ? "default" : "secondary"}>
                  {account.status}
                </Badge>
              </div>
            </div>
          </div>
          <Button onClick={handleOpenPortal} disabled={openingPortal} variant="outline">
            {openingPortal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
            Fakturaportal
          </Button>
        </div>

        {/* Plan summary */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-muted-foreground font-subhead mb-2">Seter</div>
            <div className="font-headline text-2xl font-bold text-headline">
              {usedSeats} <span className="text-base text-muted-foreground font-body">/ {account.seat_count}</span>
            </div>
            <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${seatPercent}%` }} />
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-muted-foreground font-subhead mb-2">Prøveperiode</div>
            <div className="font-headline text-lg font-semibold text-headline">{formatDate(account.trial_ends_at)}</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-muted-foreground font-subhead mb-2">Neste fornyelse</div>
            <div className="font-headline text-lg font-semibold text-headline">{formatDate(account.current_period_end)}</div>
          </div>
        </section>

        {/* Domain verification */}
        {account.email_domain && (
          <section className="bg-card border border-border rounded-2xl p-6 mb-10">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <h2 className="font-headline text-lg font-semibold text-headline mb-1">
                    Domenetilgang for @{account.email_domain}
                  </h2>
                  <p className="text-sm text-muted-foreground font-body">
                    Når domenet er verifisert får alle med e-post på @{account.email_domain} automatisk tilgang.
                  </p>
                </div>
              </div>
              {account.domain_verified_at ? (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verifisert
                </Badge>
              ) : (
                <Badge variant="secondary">Ikke verifisert</Badge>
              )}
            </div>

            {!account.domain_verified_at && expectedTxt && (
              <div className="space-y-4">
                <div className="text-sm font-body text-muted-foreground">
                  Legg til denne TXT-recorden på <strong>@</strong> for <strong>{account.email_domain}</strong>:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <div className="mt-1 px-3 py-2 bg-muted rounded-lg font-mono text-sm">TXT</div>
                  </div>
                  <div>
                    <Label className="text-xs">Navn</Label>
                    <div className="mt-1 px-3 py-2 bg-muted rounded-lg font-mono text-sm">@</div>
                  </div>
                  <div>
                    <Label className="text-xs">Verdi</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-muted rounded-lg font-mono text-xs truncate">{expectedTxt}</div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(expectedTxt, "Verdi")}
                        type="button"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground font-body">
                    DNS-endringer kan ta opptil noen timer før de er synlige.
                  </p>
                  <Button onClick={handleVerifyDomain} disabled={verifying}>
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verifiser nå
                  </Button>
                </div>
                {verifyResult && (
                  <div
                    className={`text-sm rounded-lg p-3 ${
                      verifyResult.ok
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {verifyResult.message}
                  </div>
                )}
              </div>
            )}

            {account.domain_verified_at && (
              <p className="text-sm text-muted-foreground font-body">
                Verifisert {formatDate(account.domain_verified_at)}.
              </p>
            )}
          </section>
        )}

        {/* Invite */}
        <section className="bg-card border border-border rounded-2xl p-6 mb-10">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-5 h-5 text-accent" />
            <h2 className="font-headline text-lg font-semibold text-headline">Inviter medarbeider</h2>
          </div>
          <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">
                E-post
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="navn@firma.no"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={inviting || usedSeats >= account.seat_count}>
              {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Send invitasjon
            </Button>
          </form>
          {usedSeats >= account.seat_count && (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-subhead font-semibold text-sm text-destructive mb-1">
                    Alle {account.seat_count} seter er i bruk
                  </p>
                  <p className="text-sm text-muted-foreground font-body mb-3">
                    Trenger du plass til flere medarbeidere? Be om utvidelse, så
                    tar salgsteamet kontakt med tilbud.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => setSeatRequestOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Be om flere seter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenPortal}
                      disabled={openingPortal}
                    >
                      {openingPortal ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-2" />
                      )}
                      Endre i fakturaportal
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Seat list */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-accent" />
            <h2 className="font-headline text-lg font-semibold text-headline">
              Brukere ({usedSeats})
            </h2>
          </div>
          {seats.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <p className="text-muted-foreground font-body text-sm">Ingen brukere lagt til ennå.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {seats.map((seat) => (
                <div key={seat.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="font-body text-sm text-foreground truncate">{seat.email}</div>
                    <div className="text-xs text-muted-foreground font-body mt-0.5 flex items-center gap-2">
                      {seat.accepted_at ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Invitert {formatDate(seat.invited_at)}
                        </span>
                      )}
                      <span>·</span>
                      <span>
                        {seat.source === "domain_auto"
                          ? "Domeneautomatikk"
                          : seat.source === "invite"
                            ? "Invitasjon"
                            : seat.source}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveSeat(seat.id)}
                    aria-label={`Fjern ${seat.email}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={seatRequestOpen} onOpenChange={setSeatRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Be om flere seter</DialogTitle>
            <DialogDescription>
              Salgsteamet vårt tar kontakt på e-posten du er logget inn med, og
              sender pristilbud for utvidelsen. Vi åpner også et e-postutkast så
              du kan legge til detaljer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="seat-request-count">Antall ekstra seter</Label>
              <Input
                id="seat-request-count"
                type="number"
                min={1}
                max={500}
                value={seatRequestCount}
                onChange={(e) => setSeatRequestCount(Number(e.target.value))}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground font-body mt-1.5">
                Nåværende plan: {account.seat_count} seter ({usedSeats} i bruk).
              </p>
            </div>
            <div>
              <Label htmlFor="seat-request-note">Kommentar (valgfritt)</Label>
              <Textarea
                id="seat-request-note"
                placeholder="F.eks. ønsket startdato, faktureringsadresse, eller spørsmål om volumrabatt."
                value={seatRequestNote}
                onChange={(e) => setSeatRequestNote(e.target.value)}
                rows={4}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSeatRequestOpen(false)}
              disabled={seatRequestSubmitting}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSeatRequest}
              disabled={seatRequestSubmitting || seatRequestCount < 1}
            >
              {seatRequestSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Send forespørsel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
