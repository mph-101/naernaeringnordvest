import { useState } from "react";
import { MessageSquare, Newspaper, BarChart2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";

const regions = [
  { id: "more_og_romsdal", labelNo: "Møre og Romsdal", labelEn: "Møre og Romsdal" },
  { id: "vestlandet", labelNo: "Vestlandet", labelEn: "Western Norway" },
  { id: "nord_norge", labelNo: "Nord-Norge", labelEn: "Northern Norway" },
  { id: "trondelag", labelNo: "Trøndelag", labelEn: "Trøndelag" },
  { id: "ostlandet", labelNo: "Østlandet", labelEn: "Eastern Norway" },
  { id: "sorlandet", labelNo: "Sørlandet", labelEn: "Southern Norway" },
];

const views = [
  {
    id: "search" as const,
    icon: MessageSquare,
    titleNo: "Spør",
    titleEn: "Ask",
    descNo: "Still spørsmål og få svar om lokalt næringsliv",
    descEn: "Ask questions about local business",
    route: "/?view=search",
  },
  {
    id: "feed" as const,
    icon: Newspaper,
    titleNo: "Utforsk",
    titleEn: "Explore",
    descNo: "Bla gjennom nyheter og analyser fra ditt nærområde",
    descEn: "Browse news and analysis from your area",
    route: "/?view=feed",
  },
  {
    id: "tall" as const,
    icon: BarChart2,
    titleNo: "Tall",
    titleEn: "Numbers",
    descNo: "Utforsk data og statistikk fra lokalt næringsliv",
    descEn: "Explore data and statistics from local business",
    route: "/idrett",
  },
];

export default function Onboarding() {
  const { language, setDefaultView, completeOnboarding, setRegion } = useTheme();
  const navigate = useNavigate();
  const isNo = language === "no";

  const [step, setStep] = useState<"region" | "view">("region");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const handleRegionSelect = (regionId: string) => {
    setSelectedRegion(regionId);
    setRegion(regionId);
    // Save to profile if logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from("profiles").update({ region: regionId } as any).eq("user_id", session.user.id);
      }
    });
    setStep("view");
  };

  const handleViewSelect = (view: typeof views[number]) => {
    setDefaultView(view.id);
    completeOnboarding();
    navigate(view.route, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center animate-fade-up">
        {/* Logo */}
        <div className="w-16 h-16 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-primary-foreground font-headline font-bold text-2xl">S</span>
        </div>

        {step === "region" ? (
          <>
            <h1 className="font-headline text-3xl md:text-4xl font-bold mb-3">
              {isNo ? "Velkommen til SPØK" : "Welcome to SPØK"}
            </h1>
            <p className="text-muted-foreground font-body text-lg mb-10 max-w-md mx-auto">
              {isNo ? "Velg din region for lokale nyheter og analyser" : "Choose your region for local news and analysis"}
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              {regions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRegionSelect(r.id)}
                  className="group flex items-center gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-elevated transition-all duration-300"
                >
                  <MapPin className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="font-subhead font-medium text-foreground">
                    {isNo ? r.labelNo : r.labelEn}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1 className="font-headline text-3xl md:text-4xl font-bold mb-3">
              {isNo ? "Velg din startside" : "Choose your start page"}
            </h1>
            <p className="text-muted-foreground font-body text-lg mb-10 max-w-md mx-auto">
              {isNo ? "Du kan alltid endre dette senere." : "You can always change this later."}
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {views.map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.id}
                    onClick={() => handleViewSelect(v)}
                    className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-elevated transition-all duration-300"
                  >
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/15 transition-colors duration-300">
                      <Icon className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                    </div>
                    <div>
                      <h2 className="font-headline text-xl font-semibold mb-1.5">
                        {isNo ? v.titleNo : v.titleEn}
                      </h2>
                      <p className="text-sm text-muted-foreground font-body leading-relaxed">
                        {isNo ? v.descNo : v.descEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep("region")}
              className="text-sm text-muted-foreground hover:text-foreground mt-6 font-body transition-colors"
            >
              ← {isNo ? "Endre region" : "Change region"}
            </button>
          </>
        )}

        <p className="text-xs text-muted-foreground mt-10 font-body">
          {isNo ? "Lokalt næringsliv i fokus" : "Local business in focus"}
        </p>
      </div>
    </div>
  );
}
