import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTheme } from "@/hooks/useTheme";
import { isFeatureEnabled, type FeatureKey } from "@/lib/features";
import {
  X, ChevronLeft, ChevronRight, ArrowRight,
  Bot, Newspaper, BarChart3, Headphones, Users, StickyNote,
  CheckSquare, Repeat, Calendar, Briefcase, Brain,
  type LucideIcon,
} from "lucide-react";

/**
 * Feature walkthrough — a route-agnostic onboarding carousel.
 *
 * Unlike the compass spotlight tour (MascotTour), which can only highlight
 * elements present on the current page, this is a self-contained modal of
 * "feature cards" covering the app's critical features regardless of which
 * route they live on. Each card has a "go there" link.
 *
 * Triggered manually from profile settings via the `nn:feature-walkthrough-start`
 * window event (mirrors the `nn:mascot-start` pattern), and auto-shown once for
 * new users (gated on a localStorage flag, à la `nn_mascot_tour`).
 */

interface FeatureCard {
  key: string;
  Icon: LucideIcon;
  titleNo: string;
  titleEn: string;
  descNo: string;
  descEn: string;
  route: string;
  /** When set, the card is hidden unless this feature flag is enabled. */
  flag?: FeatureKey;
}

const CARDS: FeatureCard[] = [
  {
    key: "spor", Icon: Bot, route: "/",
    titleNo: "Spør", titleEn: "Ask",
    descNo: "Still et spørsmål og få svar hentet rett fra artikkelarkivet — med kildehenvisninger.",
    descEn: "Ask a question and get answers drawn straight from the article archive — with sources.",
  },
  {
    key: "utforsk", Icon: Newspaper, route: "/",
    titleNo: "Utforsk", titleEn: "Explore",
    descNo: "Bla i de ferskeste næringssakene fra hele regionen i nyhetsfeeden.",
    descEn: "Browse the latest business stories from across the region in the news feed.",
  },
  {
    key: "tall", Icon: BarChart3, route: "/tall",
    titleNo: "Tall", titleEn: "Numbers",
    descNo: "Utforsk nøkkeltall og selskapsdata for næringslivet i regionen.",
    descEn: "Explore key figures and company data for the regional business scene.",
  },
  {
    key: "lytt", Icon: Headphones, route: "/lytt", flag: "AUDIO_FIRST",
    titleNo: "Lytt", titleEn: "Listen",
    descNo: "Hør artikler og lydinnhold mens du gjør andre ting.",
    descEn: "Listen to articles and audio content while you do other things.",
  },
  {
    key: "grupper", Icon: Users, route: "/grupper",
    titleNo: "Grupper", titleEn: "Groups",
    descNo: "Diskuter saker i åpne eller lukkede grupper med andre lesere.",
    descEn: "Discuss stories in open or invite-only groups with other readers.",
  },
  {
    key: "notater", Icon: StickyNote, route: "/mine-delte-notater",
    titleNo: "Notater", titleEn: "Notes",
    descNo: "Skriv private notater på saker, eksporter dem eller del dem i en gruppe.",
    descEn: "Write private notes on stories, export them or share them to a group.",
  },
  {
    key: "polls", Icon: CheckSquare, route: "/",
    titleNo: "Ukens spørsmål", titleEn: "Question of the week",
    descNo: "Svar på ukens spørsmål og se hva andre lesere mener.",
    descEn: "Answer the question of the week and see what other readers think.",
  },
  {
    key: "jobbytter", Icon: Repeat, route: "/",
    titleNo: "Jobbskifter", titleEn: "Job changes",
    descNo: "Følg med på hvem som bytter jobb i næringslivet i regionen.",
    descEn: "Keep track of who's changing jobs across the regional business scene.",
  },
  {
    key: "arrangementer", Icon: Calendar, route: "/arrangementer",
    titleNo: "Arrangementer", titleEn: "Events",
    descNo: "Finn næringslivsarrangementer og meld deg på det som er relevant.",
    descEn: "Find business events and sign up for the ones relevant to you.",
  },
  {
    key: "stillinger", Icon: Briefcase, route: "/stillinger",
    titleNo: "Stillinger", titleEn: "Jobs",
    descNo: "Se ledige stillinger i lokalt næringsliv — eller legg ut din egen.",
    descEn: "See open roles across local business — or post your own.",
  },
  {
    key: "hjernetrim", Icon: Brain, route: "/hjernetrim", flag: "GAMES",
    titleNo: "Hjernetrim", titleEn: "Brain games",
    descNo: "Ta en pause med små hjernetrim-oppgaver mellom sakene.",
    descEn: "Take a break with small brain-teaser puzzles between the stories.",
  },
];

const LOCAL_KEY = "nn_feature_walkthrough";

function writeSeen() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ seen: true }));
  } catch {}
}

export function FeatureWalkthrough() {
  const { language } = useTheme();
  const isNo = language === "no";
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  // Only cards whose feature flag (if any) is enabled.
  const cards = CARDS.filter((c) => !c.flag || isFeatureEnabled(c.flag));

  // Manual start from profile settings.
  useEffect(() => {
    const onStart = () => { setIdx(0); setOpen(true); };
    window.addEventListener("nn:feature-walkthrough-start", onStart);
    return () => window.removeEventListener("nn:feature-walkthrough-start", onStart);
  }, []);

  // Bevisst ingen auto-visning: touren konkurrerte med selve avisa ved første
  // besøk (design-audit 2026-07-08). Den startes manuelt fra profilinnstillingene
  // via nn:feature-walkthrough-start-eventet over.

  const t = isNo
    ? { title: "Funksjonsgjennomgang", close: "Lukk", goThere: "Gå dit", skip: "Hopp over", back: "Tilbake", next: "Neste", done: "Ferdig" }
    : { title: "Feature walkthrough", close: "Close", goThere: "Go there", skip: "Skip", back: "Back", next: "Next", done: "Done" };

  if (!open || cards.length === 0) return null;

  const safeIdx = Math.min(idx, cards.length - 1);
  const card = cards[safeIdx];
  const isLast = safeIdx >= cards.length - 1;
  const Icon = card.Icon;

  const finish = () => { writeSeen(); setOpen(false); };
  const goThere = () => { writeSeen(); setOpen(false); navigate(card.route); };

  return (
    /* Radix Dialog gir dialog-rolle, aria-modal, fokusfelle og Escape —
       den håndrullede overlayen manglet alt (samme grep som paywall-modalen). */
    <DialogPrimitive.Root open onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-foreground/40 backdrop-blur-sm animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed z-[80] inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full max-w-md mx-auto bg-card rounded-2xl shadow-elevated animate-scale-in flex flex-col focus:outline-none"
        >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <DialogPrimitive.Title asChild>
            <h3 className="font-headline text-lg font-bold text-headline">{t.title}</h3>
          </DialogPrimitive.Title>
          <button
            onClick={finish}
            aria-label={t.close}
            className="p-2 min-w-10 min-h-10 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card */}
        <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Icon className="w-8 h-8 text-accent-ink" />
          </div>
          <h4 className="font-headline text-xl font-bold text-headline">
            {isNo ? card.titleNo : card.titleEn}
          </h4>
          <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-sm">
            {isNo ? card.descNo : card.descEn}
          </p>
          <button
            onClick={goThere}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft"
          >
            {t.goThere}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Progress dots — dekorative; telleren under bærer informasjonen */}
        <div aria-hidden="true" className="flex items-center justify-center gap-1.5 pb-1">
          {cards.map((c, i) => (
            <span
              key={c.key}
              className={`h-1.5 rounded-full transition-all ${i === safeIdx ? "w-5 bg-accent" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex items-center justify-between gap-2">
          <button
            onClick={finish}
            className="text-xs font-subhead text-muted-foreground hover:text-foreground px-2 py-1"
          >
            {t.skip}
          </button>
          <span className="text-[0.6875rem] font-subhead text-muted-foreground tabular-nums">
            {safeIdx + 1} / {cards.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={safeIdx === 0}
              className="inline-flex items-center gap-1 text-xs font-subhead font-medium text-foreground px-3 py-1.5 rounded-full hover:bg-secondary transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {t.back}
            </button>
            <button
              onClick={() => (isLast ? finish() : setIdx((i) => i + 1))}
              className="inline-flex items-center gap-1 text-xs font-subhead font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded-full hover:bg-accent/90 transition-colors"
            >
              {isLast ? t.done : t.next}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
