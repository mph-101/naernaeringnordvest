import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useHideGlobalChrome } from "@/lib/global-chrome";

const CONTACT_EMAIL = "redaktor@naernaering.no";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Postgres unique_violation: the address is already on the list.
const ALREADY_SUBSCRIBED = "23505";

type Status = "idle" | "submitting" | "done" | "invalid" | "error";

/**
 * Førlanseringssiden. Bevisst uten Header/SiteFooter: ingen navigasjon inn i
 * testinnholdet, og ingen påstander (medlemskap, eierskap) som ikke er på
 * plass før lansering. Vises av middleware på alle offentlige ruter når
 * PRELAUNCH er på.
 */
export function PrelaunchPage() {
  useHideGlobalChrome();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(address)) {
      setStatus("invalid");
      return;
    }
    setStatus("submitting");
    // Plain insert, not upsert: anonymous visitors may insert but not update
    // (RLS), and a repeat sign-up should not touch the existing row.
    const { error } = await supabase.from("newsletter_subscriptions").insert({
      email: address,
      frequency: "weekly",
      topics: ["launch"],
      region_slugs: ["nordvestlandet"],
    });
    if (error && error.code !== ALREADY_SUBSCRIBED) {
      setStatus("error");
      return;
    }
    setStatus("done");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 object-contain dark:bg-white dark:rounded-full dark:p-0.5"
            />
            <p className="font-headline text-xl font-semibold text-headline leading-none">
              Nær <span className="font-body text-sm font-medium text-accent-ink">Nordvest</span>
            </p>
          </div>

          <div className="space-y-4">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-headline leading-tight [text-wrap:balance]">
              Kommer snart
            </h1>
            <p className="text-lg text-foreground font-body leading-relaxed">
              Nær Nordvest er en ny næringslivsavis for Møre og Romsdal. Vi er
              ikke i gang ennå. Legg igjen e-postadressen din, så sier vi fra
              når vi lanserer.
            </p>
          </div>

          {status === "done" ? (
            <p role="status" className="rounded-xl border border-border bg-card p-5 text-foreground font-body">
              Takk! Du får en e-post fra oss når vi lanserer.
            </p>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-3">
              <Label htmlFor="prelaunch-email">E-postadresse</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  id="prelaunch-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status !== "submitting") setStatus("idle");
                  }}
                  aria-invalid={status === "invalid"}
                  aria-describedby="prelaunch-help"
                  className="h-11"
                />
                <Button type="submit" size="lg" disabled={status === "submitting"} className="h-11 px-6">
                  {status === "submitting" ? "Sender …" : "Si fra til meg"}
                </Button>
              </div>
              <div id="prelaunch-help" className="text-sm font-body" aria-live="polite">
                {status === "invalid" && (
                  <p className="text-destructive-ink">Skriv inn en gyldig e-postadresse.</p>
                )}
                {status === "error" && (
                  <p className="text-destructive-ink">
                    Påmeldingen gikk ikke gjennom. Prøv igjen, eller send oss en e-post på{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Vi bruker adressen til å varsle deg om lanseringen og sende deg
                nyhetsbrevet vårt. Du kan melde deg av når som helst.
              </p>
            </form>
          )}
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-sm text-muted-foreground font-body">
        Kontakt:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline inline-block py-2">
          {CONTACT_EMAIL}
        </a>
      </footer>
    </div>
  );
}

export default PrelaunchPage;
