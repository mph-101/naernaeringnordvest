import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/Header";
import { useTheme } from "@/hooks/useTheme";

export default function SubscribeReturn() {
  const navigate = useNavigate();
  const { language } = useTheme();
  const isNo = language === "no";

  // Rå Stripe-sesjons-ID og uvarslet auto-redirect etter 4 sek er fjernet
  // (re-audit klarhet P3): kvitteringen skal kunne leses i fred, og
  // referansen finnes i Stripe-kvitteringen på e-post.

  const t = isNo
    ? {
        title: "Velkommen som abonnent!",
        desc: "Du har nå full tilgang til alle saker, Spør-AI og selskapsdatabasen. Kvittering kommer på e-post.",
        cta: "Til min profil",
      }
    : {
        title: "Welcome aboard!",
        desc: "You now have full access to every story, the Ask AI and the company database. A receipt is on its way by email.",
        cta: "Go to my profile",
      };

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-accent-ink" />
        </div>
        <h1 className="font-headline text-2xl font-bold text-headline mb-3">{t.title}</h1>
        <p className="text-muted-foreground font-body mb-6">{t.desc}</p>
        <button
          onClick={() => navigate("/profil")}
          className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          {t.cta}
        </button>
      </div>
    </div>
  );
}
