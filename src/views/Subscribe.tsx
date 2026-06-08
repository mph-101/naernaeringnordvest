import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowLeft, Building2, User, X } from "lucide-react";
import { Header } from "@/components/Header";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

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

const SHARED_PERSONAL_BULLETS = [
  "Alle saker, analyser og dypdykk",
  "Spør-AI og selskapsdatabasen Tall",
  "Personlige varsler ved nye saker du følger",
  "Diskuter saker i åpne og lukkede grupper",
  "Si opp når som helst",
];

const PLANS: PlanDef[] = [
  {
    id: "quarterly",
    name: "Kvartal",
    price: "249 kr",
    period: "/ 3 måneder",
    monthly: "≈ 83 kr/mnd",
    bullets: SHARED_PERSONAL_BULLETS,
    icon: User,
  },
  {
    id: "yearly",
    name: "År",
    price: "890 kr",
    period: "/ år",
    monthly: "≈ 74 kr/mnd · Spar 106 kr/år vs kvartal",
    bullets: SHARED_PERSONAL_BULLETS,
    highlight: true,
    icon: User,
  },
  {
    id: "business_seat",
    name: "Bedrift",
    price: "fra 490 kr",
    period: "/ sete / år",
    monthly: "Volumrabatt fra 10 og 30 seter · Faktureres årlig",
    tiers: [
      { range: "1–9 seter", price: "690 kr/sete/år" },
      { range: "10–29 seter", price: "590 kr/sete/år" },
      { range: "30+ seter", price: "490 kr/sete/år" },
    ],
    bullets: [
      "Alle ansatte får full tilgang",
      "Automatisk innlogging via verifisert e-postdomene",
      "Sentral fakturering — én faktura per år",
      "Lukkede grupper for hele bedriften",
    ],
    icon: Building2,
  },
];

export default function Subscribe() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isActive } = useSubscription();
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [seatCount, setSeatCount] = useState(5);
  const [companyName, setCompanyName] = useState("");
  const [orgnr, setOrgnr] = useState("");
  const [emailDomain, setEmailDomain] = useState("");

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
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Tilbake
        </button>

        <div className="text-center mb-12">
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-headline mb-3">
            Bli abonnent
          </h1>
          <p className="text-muted-foreground font-body max-w-xl mx-auto">
            Alle saker, Spør-AI og selskapsdatabasen — i én tilgang.
          </p>
        </div>

        {isActive && (
          <div className="mb-8 p-4 bg-accent/10 border border-accent/20 rounded-xl text-center font-body text-sm">
            Du har allerede et aktivt abonnement.{" "}
            <button onClick={() => navigate("/profil")} className="underline font-medium">
              Se profil
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((p) => {
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
                    Mest populær
                  </span>
                )}
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h2 className="font-headline text-xl font-bold text-headline mb-1">{p.name}</h2>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-headline text-3xl font-bold text-headline">{p.price}</span>
                  <span className="text-sm text-muted-foreground font-body">{p.period}</span>
                </div>
                <p className="text-xs text-muted-foreground font-body mb-5">{p.monthly}</p>
                {p.tiers && (
                  <div className="mb-5 bg-surface-subtle border border-border rounded-xl p-3">
                    <p className="text-[10px] font-subhead font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Pris per sete
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
                      <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
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
                  Bli abonnent
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground font-body mt-8 max-w-2xl mx-auto">
          MVA (25 %) kommer i tillegg og beregnes ved utsjekk. Bedrifter faktureres årlig
          forskuddsvis. Du kan kansellere når som helst fra profilen din.
        </p>
      </div>

      {activePlan && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl border border-border shadow-elevated w-full max-w-2xl my-12 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-xl font-bold text-headline">
                Fullfør abonnement —{" "}
                {PLANS.find((p) => p.id === activePlan)?.name}
              </h2>
              <button
                onClick={() => setActivePlan(null)}
                className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"
                aria-label="Lukk"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activePlan === "business_seat" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="company">Bedriftsnavn</Label>
                  <Input
                    id="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme AS"
                  />
                </div>
                <div>
                  <Label htmlFor="orgnr">Org.nr (valgfritt)</Label>
                  <Input id="orgnr" value={orgnr} onChange={(e) => setOrgnr(e.target.value)} placeholder="999999999" />
                </div>
                <div>
                  <Label htmlFor="seats">Antall seter</Label>
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
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {perSeat} kr × {seatCount} {seatCount === 1 ? "sete" : "seter"} ={" "}
                        <span className="font-subhead font-semibold text-foreground">
                          {total.toLocaleString("nb-NO")} kr / år
                        </span>
                        {" "}(ekskl. MVA)
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <Label htmlFor="domain">Firmadomene (valgfritt)</Label>
                  <Input
                    id="domain"
                    value={emailDomain}
                    onChange={(e) => setEmailDomain(e.target.value.trim().toLowerCase())}
                    placeholder="firma.no"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Verifiser senere via TXT-record for automatisk tilgang for alle ansatte.
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