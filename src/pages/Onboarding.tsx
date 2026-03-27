import { MessageSquare, Newspaper, BarChart2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";

const views = [
  {
    id: "search" as const,
    icon: MessageSquare,
    titleNo: "Spør",
    titleEn: "Ask",
    descNo: "Still spørsmål og få svar basert på verifiserte bransjedata",
    descEn: "Ask questions and get answers based on verified industry data",
    route: "/?view=search",
  },
  {
    id: "feed" as const,
    icon: Newspaper,
    titleNo: "Utforsk",
    titleEn: "Explore",
    descNo: "Bla gjennom nyheter, analyser og artikler",
    descEn: "Browse news, analysis and articles",
    route: "/?view=feed",
  },
  {
    id: "tall" as const,
    icon: BarChart2,
    titleNo: "Tall",
    titleEn: "Numbers",
    descNo: "Utforsk finansiell data og statistikk fra norsk idrett",
    descEn: "Explore financial data and statistics from Norwegian sports",
    route: "/idrett",
  },
];

export default function Onboarding() {
  const { language, setDefaultView, completeOnboarding } = useTheme();
  const navigate = useNavigate();
  const isNo = language === "no";

  const handleSelect = (view: typeof views[number]) => {
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

        <h1 className="font-headline text-3xl md:text-4xl font-bold mb-3">
          {isNo ? "Velkommen til SPØK" : "Welcome to SPØK"}
        </h1>
        <p className="text-muted-foreground font-body text-lg mb-12 max-w-md mx-auto">
          {isNo
            ? "Velg din foretrukne startside. Du kan alltid endre dette senere."
            : "Choose your preferred start page. You can always change this later."}
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {views.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => handleSelect(v)}
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

        <p className="text-xs text-muted-foreground mt-10 font-body">
          {isNo ? "Idrettens pengestrømmer" : "The money flows of sports"}
        </p>
      </div>
    </div>
  );
}
