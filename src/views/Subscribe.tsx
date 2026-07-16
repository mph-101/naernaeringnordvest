import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowLeft, Building2, User, X } from "lucide-react";
import { Header } from "@/components/Header";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";

type Plan = "quarterly" | "yearly" | "business_seat";

type PlanDef = {
  id: Plan;
  name: string;
  price: string;
  period: string;
  monthly: string;
  bullets: string[];
  highlight?: boolean;
  icon: typeof User;
  tiers?: { range: string; price: string }[];
};

export default function Subscribe() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isActive } = useSubscription();
  const { language } = useTheme();
  const isNo = language === "no";
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [seatCount, setSeatCount] = useState(5);
  const [companyName, setCompanyName] = useState("");
  const [orgnr, setOrgnr] = useState("");
  const [emailDomain, setEmailDomain] = useState("");

  // Kjøpsflyten fulgte ikke språkvalget (re-audit klarhet P2) — samme
  // labels-objekt-mønster som Login/TipForm.
  const t = isNo
    ? {
        back: "Tilbake",
        title: "Bli abonnent",
        subtitle: "Alle saker, Spør-AI og selskapsdatabasen — i én tilgang.",
        alreadyActive: "Du har allerede et aktivt abonnement.",
        seeProfile: "Se profil",
        mostPopular: "Mest populær",
        perSeat: "Pris per sete",
        subscribeCta: "Bli abonnent",
        finePrint:
          "MVA (25 %) kommer i tillegg og beregnes ved utsjekk. Bedrifter faktureres årlig forskuddsvis. Du kan si opp når som helst fra profilen din.",
        completeTitle: "Fullfør abonnement",
        close: "Lukk",
        companyLabel: "Bedriftsnavn",
        orgnrLabel: "Org.nr (valgfritt)",
        seatsLabel: "Antall seter",
        seatSingular: "sete",
        seatPlural: "seter",
        exVat: "(ekskl. MVA)",
        perYear: "kr / år",
        domainLabel: "Firmadomene (valgfritt)",
        domainHint:
          "Domenet bekreftes senere sammen med IT-ansvarlig — da får alle med e-postadresse på domenet automatisk tilgang.",
      }
    : {
        back: "Back",
        title: "Subscribe",
        subtitle: "Every story, the Ask AI and the company database — in one subscription.",
        alreadyActive: "You already have an active subscription.",
        seeProfile: "View profile",
        mostPopular: "Most popular",
        perSeat: "Price per seat",
        subscribeCta: "Subscribe",
        finePrint:
          "VAT (25%) is added at checkout. Businesses are invoiced annually in advance. You can cancel anytime from your profile.",
        completeTitle: "Complete subscription",
        close: "Close",
        companyLabel: "Company name",
        orgnrLabel: "Org. no. (optional)",
        seatsLabel: "Number of seats",
        seatSingular: "seat",
        seatPlural: "seats",
        exVat: "(ex. VAT)",
        perYear: "NOK / year",
        domainLabel: "Company domain (optional)",
        domainHint:
          "The domain is verified later together with your IT contact — then everyone with an email on the domain gets access automatically.",
      };

  const plans: PlanDef[] = useMemo(() => {
    const personalBullets = isNo
      ? [
          "Alle saker, analyser og dypdykk",
          "Spør-AI og selskapsdatabasen Tall",
          "Personlige varsler ved nye saker du følger",
          "Diskuter saker i åpne og lukkede grupper",
          "Si opp når som helst",
        ]
      : [
          "Every story, analysis and deep dive",
          "The Ask AI and the Tall company database",
          "Personal alerts for stories you follow",
          "Discuss stories in open and private groups",
          "Cancel anytime",
        ];
    return [
      {
        id: "quarterly" as const,
        name: isNo ? "Kvartal" : "Quarterly",
        price: isNo ? "249 kr" : "NOK 249",
        period: isNo ? "/ 3 måneder" : "/ 3 months",
        monthly: isNo ? "≈ 83 kr/mnd" : "≈ NOK 83/month",
        bullets: personalBullets,
        icon: User,
      },
      {
        id: "yearly" as const,
        name: isNo ? "År" : "Yearly",
        price: isNo ? "890 kr" : "NOK 890",
        period: isNo ? "/ år" : "/ year",
        monthly: isNo
          ? "≈ 74 kr/mnd · Spar 106 kr/år vs kvartal"
          : "≈ NOK 74/month · Save NOK 106/year vs quarterly",
        bullets: personalBullets,
        highlight: true,
        icon: User,
      },
      {
        id: "business_seat" as const,
        name: isNo ? "Bedrift" : "Business",
        price: isNo ? "fra 490 kr" : "from NOK 490",
        period: isNo ? "/ sete / år" : "/ seat / year",
        monthly: isNo
          ? "Volumrabatt fra 10 og 30 seter · Faktureres årlig"
          : "Volume discount from 10 and 30 seats · Invoiced annually",
        tiers: isNo
          ? [
              { range: "1–9 seter", price: "690 kr/sete/år" },
              { range: "10–29 seter", price: "590 kr/sete/år" },
              { range: "30+ seter", price: "490 kr/sete/år" },
            ]
          : [
              { range: "1–9 seats", price: "NOK 690/seat/yr" },
              { range: "10–29 seats", price: "NOK 590/seat/yr" },
              { range: "30+ seats", price: "NOK 490/seat/yr" },
            ],
        bullets: isNo
          ? [
              "Alle ansatte får full tilgang",
              "Automatisk innlogging via verifisert e-postdomene",
              "Sentral fakturering — én faktura per år",
              "Lukkede grupper for hele bedriften",
            ]
          : [
              "Full access for every employee",
              "Automatic sign-in via verified email domain",
              "Central invoicing — one invoice per year",
              "Private groups for the whole company",
            ],
        icon: Building2,
      },
    ];
  }, [isNo]);

  const handleStart = (plan: Plan) => {
    if (!isAuthenticated) {
      navigate("/login?redirect=/abonnement");
      return;
    }
    setActivePlan(plan);
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <Header showSearch={false} />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 min-h-10 px-2 -mx-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors mb-8 font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </button>

        <div className="text-center mb-12">
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-headline mb-3">
            {t.title}
          </h1>
          <p className="text-muted-foreground font-body max-w-xl mx-auto">{t.subtitle}</p>
        </div>

        {isActive && (
          <div className="mb-8 p-4 bg-accent/10 border border-accent/20 rounded-xl text-center font-body text-sm">
            {t.alreadyActive}{" "}
            <button onClick={() => navigate("/profil")} className="underline font-medium">
              {t.seeProfile}
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className={`relative bg-card rounded-2xl border p-6 flex flex-col ${
                  p.highlight ? "border-accent shadow-elevated" : "border-border shadow-soft"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-foreground text-xs font-subhead font-semibold rounded-full">
                    {t.mostPopular}
                  </span>
                )}
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-accent-ink" />
                </div>
                <h2 className="font-headline text-xl font-bold text-headline mb-1">{p.name}</h2>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-headline text-3xl font-bold text-headline">{p.price}</span>
                  <span className="text-sm text-muted-foreground font-body">{p.period}</span>
                </div>
                <p className="text-xs text-muted-foreground font-body mb-5">{p.monthly}</p>
                {p.tiers && (
                  <div className="mb-5 bg-surface-subtle border border-border rounded-xl p-3">
                    <p className="text-xs font-subhead font-medium text-muted-foreground mb-2">
                      {t.perSeat}
                    </p>
                    <ul className="space-y-1">
                      {p.tiers.map((tier) => (
                        <li key={tier.range} className="flex items-center justify-between text-xs font-body text-foreground">
                          <span className="text-muted-foreground">{tier.range}</span>
                          <span className="font-subhead font-semibold">{tier.price}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm font-body text-foreground">
                      <Check className="w-4 h-4 text-accent-ink flex-shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleStart(p.id)}
                  className={`w-full py-3 rounded-full font-subhead text-sm font-semibold transition-colors ${
                    p.highlight
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-card border border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {t.subscribeCta}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground font-body mt-8 max-w-2xl mx-auto">
          {t.finePrint}
        </p>
      </div>

      {activePlan && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl border border-border shadow-elevated w-full max-w-2xl my-12 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-xl font-bold text-headline">
                {t.completeTitle} — {plans.find((p) => p.id === activePlan)?.name}
              </h2>
              <button
                onClick={() => setActivePlan(null)}
                className="min-w-10 min-h-10 rounded-full hover:bg-secondary inline-flex items-center justify-center"
                aria-label={t.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activePlan === "business_seat" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="company">{t.companyLabel}</Label>
                  <Input
                    id="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme AS"
                  />
                </div>
                <div>
                  <Label htmlFor="orgnr">{t.orgnrLabel}</Label>
                  <Input id="orgnr" value={orgnr} onChange={(e) => setOrgnr(e.target.value)} placeholder="999999999" />
                </div>
                <div>
                  <Label htmlFor="seats">{t.seatsLabel}</Label>
                  <Input
                    id="seats"
                    type="number"
                    min={1}
                    max={500}
                    value={seatCount}
                    onChange={(e) => setSeatCount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  />
                  {/* Live tier-feedback so the buyer sees the unit price they're locking in */}
                  {(() => {
                    const perSeat = seatCount >= 30 ? 490 : seatCount >= 10 ? 590 : 690;
                    const total = perSeat * seatCount;
                    return (
                      <p className="text-[0.6875rem] text-muted-foreground mt-1">
                        {perSeat} kr × {seatCount} {seatCount === 1 ? t.seatSingular : t.seatPlural} ={" "}
                        <span className="font-subhead font-semibold text-foreground">
                          {total.toLocaleString(isNo ? "nb-NO" : "en-US")} {t.perYear}
                        </span>
                        {" "}{t.exVat}
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <Label htmlFor="domain">{t.domainLabel}</Label>
                  <Input
                    id="domain"
                    value={emailDomain}
                    onChange={(e) => setEmailDomain(e.target.value.trim().toLowerCase())}
                    placeholder="firma.no"
                  />
                  {/* Klarspråk i stedet for TXT-record-sjargong (klarhet P3) */}
                  <p className="text-[0.6875rem] text-muted-foreground mt-1">
                    {t.domainHint}
                  </p>
                </div>
              </div>
            )}

            <StripeEmbeddedCheckout
              plan={activePlan}
              seatCount={activePlan === "business_seat" ? seatCount : undefined}
              companyName={activePlan === "business_seat" ? companyName : undefined}
              orgnr={activePlan === "business_seat" ? orgnr : undefined}
              emailDomain={activePlan === "business_seat" ? emailDomain : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
