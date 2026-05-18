import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { Mail, Sunrise, CalendarDays, Briefcase, Check, Loader2, MailX } from "lucide-react";
import { maskEmail } from "@/lib/newsletter";

const SECTORS = [
  { id: "fiskeri", labelNo: "Fiskeri & havbruk", labelEn: "Fisheries & aquaculture" },
  { id: "maritim", labelNo: "Maritim & verft", labelEn: "Maritime & shipyards" },
  { id: "industri", labelNo: "Industri & teknologi", labelEn: "Industry & tech" },
  { id: "reiseliv", labelNo: "Reiseliv & handel", labelEn: "Tourism & retail" },
  { id: "eiendom", labelNo: "Eiendom & bygg", labelEn: "Real estate & construction" },
  { id: "finans", labelNo: "Finans & investering", labelEn: "Finance & investment" },
];

type SubState = {
  email: string;
  topics: string[];
  frequency: string;
  unsubscribed_at: string | null;
};

export default function Unsubscribe() {
  const { language } = useTheme();
  const isNo = language === "no";
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [morning, setMorning] = useState(false);
  const [weekly, setWeekly] = useState(false);
  const [sector, setSector] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [doneAction, setDoneAction] = useState<null | "updated" | "unsubscribed">(null);

  useEffect(() => {
    document.title = isNo ? "Endre nyhetsbrev — Nær Næring" : "Manage newsletter — Nær Næring";
  }, [isNo]);

  useEffect(() => {
    if (!token) {
      setError("missing_token");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("newsletter-manage", {
          method: "GET" as never,
          body: undefined,
          // pass token via query param using the underlying fetch
        } as never);
        // Fallback: invoke doesn't easily support GET query; do direct fetch instead.
        void data; void error;
      } catch { /* ignore — use direct fetch below */ }

      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/newsletter-manage?token=${encodeURIComponent(token)}`;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error ?? "error");
        } else {
          setSub(json as SubState);
          const topics: string[] = json.topics ?? [];
          setMorning(topics.includes("morning_brief"));
          setWeekly(topics.includes("weekly_brief"));
          const hasSector = topics.includes("sector_brief");
          setSector(hasSector);
          setSectors(topics.filter((t: string) => t.startsWith("sector:")).map((t: string) => t.slice("sector:".length)));
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const toggleSector = (id: string) =>
    setSectors((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const callManage = async (body: object) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/newsletter-manage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  };

  const onSave = async () => {
    if (!morning && !weekly && !sector) {
      toast.error(isNo ? "Velg minst ett brev, eller meld deg helt av" : "Pick at least one brief, or unsubscribe");
      return;
    }
    setSaving(true);
    const topics: string[] = [];
    if (morning) topics.push("morning_brief");
    if (weekly) topics.push("weekly_brief");
    if (sector) {
      topics.push("sector_brief");
      for (const s of sectors) topics.push(`sector:${s}`);
    }
    const frequency = morning ? "daily" : "weekly";
    const { ok, json } = await callManage({ token, action: "update", topics, frequency });
    setSaving(false);
    if (!ok) { toast.error(json?.error ?? "Error"); return; }
    setDoneAction("updated");
  };

  const onUnsubscribe = async () => {
    setUnsubscribing(true);
    const { ok, json } = await callManage({ token, action: "unsubscribe" });
    setUnsubscribing(false);
    if (!ok) { toast.error(json?.error ?? "Error"); return; }
    setDoneAction("unsubscribed");
  };

  const t = useMemo(() => isNo ? {
    title: "Administrer nyhetsbrevet ditt",
    sub: "Du kan endre hvilke brev du mottar, eller melde deg helt av.",
    morningTitle: "Daglig morgenbrief",
    morningDesc: "Det viktigste fra Nordvestlandet før kl. 07:00.",
    weeklyTitle: "Ukebrev",
    weeklyDesc: "Helgens samling: analyser, intervjuer og tall — hver fredag.",
    sectorTitle: "Sektorbrev",
    sectorDesc: "Velg bransjene du følger ekstra tett.",
    sectorsLabel: "Velg sektorer:",
    save: "Lagre endringer",
    unsub: "Meld meg helt av",
    loading: "Laster…",
    updated: "Endringene er lagret",
    updatedSub: "Du fortsetter å motta de brevene du valgte.",
    unsubscribed: "Du er nå avmeldt",
    unsubscribedSub: "Vi sender deg ikke flere nyhetsbrev. Du kan melde deg på igjen når som helst.",
    invalid: "Ugyldig eller utløpt lenke",
    invalidSub: "Avmeldingslenken er ikke gyldig. Sjekk at du brukte siste lenke fra e-posten.",
    accountFor: "Konto:",
  } : {
    title: "Manage your newsletter",
    sub: "Change which briefings you receive, or unsubscribe entirely.",
    morningTitle: "Daily morning brief",
    morningDesc: "What matters from Nordvestlandet before 7 AM.",
    weeklyTitle: "Weekly brief",
    weeklyDesc: "Weekend roundup: analysis, interviews and numbers — every Friday.",
    sectorTitle: "Sector brief",
    sectorDesc: "Pick the industries you want to follow closely.",
    sectorsLabel: "Choose sectors:",
    save: "Save changes",
    unsub: "Unsubscribe from all",
    loading: "Loading…",
    updated: "Your preferences are saved",
    updatedSub: "You'll keep receiving the briefings you picked.",
    unsubscribed: "You're unsubscribed",
    unsubscribedSub: "We won't send you more newsletters. You can resubscribe any time.",
    invalid: "Invalid or expired link",
    invalidSub: "The unsubscribe link is not valid. Make sure you used the latest link from your email.",
    accountFor: "Account:",
  }, [isNo]);

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <header className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-accent" />
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-headline mb-3">{t.title}</h1>
          <p className="text-muted-foreground font-body text-lg">{t.sub}</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> {t.loading}
          </div>
        ) : error || !sub ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <h2 className="font-headline text-xl font-bold text-headline mb-2">{t.invalid}</h2>
            <p className="text-muted-foreground font-body">{t.invalidSub}</p>
          </div>
        ) : doneAction ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${doneAction === "unsubscribed" ? "bg-muted" : "bg-emerald-100"}`}>
              {doneAction === "unsubscribed" ? <MailX className="w-6 h-6 text-muted-foreground" /> : <Check className="w-6 h-6 text-emerald-600" />}
            </div>
            <h2 className="font-headline text-xl font-bold text-headline mb-2">
              {doneAction === "unsubscribed" ? t.unsubscribed : t.updated}
            </h2>
            <p className="text-muted-foreground font-body">
              {doneAction === "unsubscribed" ? t.unsubscribedSub : t.updatedSub}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-xl px-4 py-3 text-sm font-body text-muted-foreground">
              {t.accountFor} <span className="text-foreground font-medium">{maskEmail(sub.email)}</span>
            </div>

            <OptionCard
              icon={<Sunrise className="w-5 h-5" />}
              title={t.morningTitle}
              desc={t.morningDesc}
              checked={morning}
              onChange={setMorning}
            />
            <OptionCard
              icon={<CalendarDays className="w-5 h-5" />}
              title={t.weeklyTitle}
              desc={t.weeklyDesc}
              checked={weekly}
              onChange={setWeekly}
            />
            <OptionCard
              icon={<Briefcase className="w-5 h-5" />}
              title={t.sectorTitle}
              desc={t.sectorDesc}
              checked={sector}
              onChange={setSector}
            />

            {sector && (
              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-sm font-subhead font-medium text-muted-foreground mb-3">{t.sectorsLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {SECTORS.map((s) => {
                    const active = sectors.includes(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => toggleSector(s.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-subhead font-medium transition-all border ${
                          active
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-card text-foreground border-border hover:border-accent/40"
                        }`}
                      >
                        {isNo ? s.labelNo : s.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onSave}
                disabled={saving || unsubscribing}
                className="flex-1 py-3.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t.save}
              </button>
              <button
                type="button"
                onClick={onUnsubscribe}
                disabled={saving || unsubscribing}
                className="flex-1 py-3.5 bg-card border border-border text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {unsubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailX className="w-4 h-4" />}
                {t.unsub}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function OptionCard({
  icon, title, desc, checked, onChange,
}: { icon: React.ReactNode; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
        checked ? "border-accent bg-accent/5" : "border-border bg-card hover:border-accent/30"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${checked ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-headline text-base font-semibold text-headline mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground font-body">{desc}</p>
        </div>
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 ${checked ? "border-accent bg-accent" : "border-border"}`}>
          {checked && <Check className="w-3.5 h-3.5 text-accent-foreground" />}
        </div>
      </div>
    </button>
  );
}