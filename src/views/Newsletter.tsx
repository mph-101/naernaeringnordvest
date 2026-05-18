import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { Mail, Sunrise, CalendarDays, Briefcase, Check, Loader2 } from "lucide-react";

const SECTORS = [
  { id: "fiskeri", labelNo: "Fiskeri & havbruk", labelEn: "Fisheries & aquaculture" },
  { id: "maritim", labelNo: "Maritim & verft", labelEn: "Maritime & shipyards" },
  { id: "industri", labelNo: "Industri & teknologi", labelEn: "Industry & tech" },
  { id: "reiseliv", labelNo: "Reiseliv & handel", labelEn: "Tourism & retail" },
  { id: "eiendom", labelNo: "Eiendom & bygg", labelEn: "Real estate & construction" },
  { id: "finans", labelNo: "Finans & investering", labelEn: "Finance & investment" },
];

export default function Newsletter() {
  const { language } = useTheme();
  const isNo = language === "no";
  const [email, setEmail] = useState("");
  const [morning, setMorning] = useState(true);
  const [weekly, setWeekly] = useState(true);
  const [sector, setSector] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = isNo ? "Nyhetsbrev — Nær Næring" : "Newsletter — Nær Næring";
  }, [isNo]);

  const toggleSector = (id: string) =>
    setSectors((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!morning && !weekly && !sector) {
      toast.error(isNo ? "Velg minst ett nyhetsbrev" : "Pick at least one newsletter");
      return;
    }
    setSubmitting(true);
    const topics: string[] = [];
    if (morning) topics.push("morning_brief");
    if (weekly) topics.push("weekly_brief");
    if (sector) {
      topics.push("sector_brief");
      for (const s of sectors) topics.push(`sector:${s}`);
    }
    const frequency = morning ? "daily" : "weekly";
    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      email: email.trim().toLowerCase(),
      frequency,
      topics,
      user_id: session?.user?.id ?? null,
    };
    const { error } = await supabase
      .from("newsletter_subscriptions")
      .upsert(payload, { onConflict: "email" });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
    toast.success(isNo ? "Påmeldt! Sjekk e-posten din." : "Subscribed! Check your inbox.");
  };

  const t = isNo
    ? {
        hero: "Hold deg oppdatert på lokal næring",
        sub: "Få våre redaksjonelle brev rett i innboksen. Ingen spam — bare det viktigste.",
        morningTitle: "Daglig morgenbrief",
        morningDesc: "Det viktigste fra Nordvestlandet før kl. 07:00.",
        weeklyTitle: "Ukebrev",
        weeklyDesc: "Helgens samling: analyser, intervjuer og tall — hver fredag.",
        sectorTitle: "Sektorbrev",
        sectorDesc: "Velg bransjene du følger ekstra tett.",
        sectorsLabel: "Velg sektorer:",
        email: "E-postadresse",
        submit: "Meld meg på",
        success: "Takk! Du er påmeldt.",
        successSub: "Vi har sendt deg en e-post for å bekrefte påmeldingen.",
      }
    : {
        hero: "Stay on top of local business",
        sub: "Get our editorial briefings straight to your inbox. No spam — only what matters.",
        morningTitle: "Daily morning brief",
        morningDesc: "What matters from Nordvestlandet before 7 AM.",
        weeklyTitle: "Weekly brief",
        weeklyDesc: "Weekend roundup: analysis, interviews and numbers — every Friday.",
        sectorTitle: "Sector brief",
        sectorDesc: "Pick the industries you want to follow closely.",
        sectorsLabel: "Choose sectors:",
        email: "Email address",
        submit: "Subscribe",
        success: "Thanks! You're subscribed.",
        successSub: "We've sent a confirmation email.",
      };

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <header className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-accent" />
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-headline mb-3">{t.hero}</h1>
          <p className="text-muted-foreground font-body text-lg">{t.sub}</p>
        </header>

        {done ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="font-headline text-xl font-bold text-headline mb-2">{t.success}</h2>
            <p className="text-muted-foreground font-body">{t.successSub}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
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

            <div className="pt-2">
              <label htmlFor="nl-email" className="block text-sm font-subhead font-medium text-foreground mb-2">{t.email}</label>
              <input
                id="nl-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="navn@firma.no"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl font-body text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {t.submit}
            </button>
          </form>
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