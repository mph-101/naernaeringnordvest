import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { CompassMascot } from "./CompassMascot";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { ChevronRight, X, Compass } from "lucide-react";

interface Step {
  selector: string;
  titleNo: string;
  titleEn: string;
  bodyNo: string;
  bodyEn: string;
  routeMatch?: (path: string) => boolean;
}

const STEPS: Step[] = [
  { selector: '[data-tour="view-toggle"]', titleNo: "Tre veier inn", titleEn: "Three ways in",
    bodyNo: "Bytt mellom å spørre AI-en, lese feeden eller utforske tall.", bodyEn: "Switch between asking the AI, reading the feed or exploring numbers.",
    routeMatch: (p) => p === "/" },
  { selector: '[data-tour="frontpage-poll"]', titleNo: "Ukens spørsmål", titleEn: "Question of the week",
    bodyNo: "Stem og se hva andre lesere mener — gjennomsnittet vises etter ditt eget svar.", bodyEn: "Vote and see what other readers think — the average appears after you answer.",
    routeMatch: (p) => p === "/" },
  { selector: '[data-tour="news-feed"]', titleNo: "Nyhetsbildet", titleEn: "The news",
    bodyNo: "Bla i lokale næringssaker fra hele regionen.", bodyEn: "Browse local business stories from the whole region.",
    routeMatch: (p) => p === "/" },
  { selector: '[data-tour="job-changes"]', titleNo: "Jobbskifter", titleEn: "Job changes",
    bodyNo: "Hvem bytter jobb i regionen? Sveip gjennom de ferskeste meldingene.", bodyEn: "Who's switching jobs locally? Swipe through the latest announcements.",
    routeMatch: (p) => p === "/" },
  { selector: '[data-tour="nav-groups"]', titleNo: "Grupper", titleEn: "Groups",
    bodyNo: "Diskuter saker i åpne eller lukkede grupper med andre lesere.", bodyEn: "Discuss stories in open or invite-only groups with other readers." },
  { selector: '[data-tour="nav-jobs"]', titleNo: "Stillinger", titleEn: "Jobs",
    bodyNo: "Ledige stillinger i lokalt næringsliv — eller legg ut din egen.", bodyEn: "Open roles across local business — or post your own." },
  { selector: '[data-tour="article-engagement"]', titleNo: "Gjør noe med saken", titleEn: "Act on the story",
    bodyNo: "Skriv et notat, del videre eller skriv direkte til journalisten.", bodyEn: "Write a note, share it, or message the journalist directly.",
    routeMatch: (p) => p.startsWith("/article/") },
  { selector: '[data-tour="article-notes"]', titleNo: "Dine notater", titleEn: "Your notes",
    bodyNo: "Knappen nede til høyre åpner private notater du kan eksportere senere.", bodyEn: "The button bottom-right opens private notes you can export later.",
    routeMatch: (p) => p.startsWith("/article/") },
];

const LOCAL_KEY = "nn_mascot_tour";

function readLocal(): { dismissed: boolean; completed: boolean; mascotEnabled: boolean } {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : { dismissed: false, completed: false, mascotEnabled: true };
  } catch {
    return { dismissed: false, completed: false, mascotEnabled: true };
  }
}
function writeLocal(v: Partial<ReturnType<typeof readLocal>>) {
  try {
    const cur = readLocal();
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...cur, ...v }));
  } catch {}
}

export function MascotTour() {
  const { userId } = useAuth();
  const { language } = useTheme();
  const location = useLocation();
  const isNo = language === "no";

  const [enabled, setEnabled] = useState<boolean>(() => readLocal().mascotEnabled);
  const [completed, setCompleted] = useState<boolean>(() => readLocal().completed);
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Sync with profile
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("mascot_enabled, tour_completed_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        const mascotEnabled = (data as any).mascot_enabled !== false;
        const tourDone = !!(data as any).tour_completed_at;
        setEnabled(mascotEnabled);
        setCompleted(tourDone);
        writeLocal({ mascotEnabled, completed: tourDone });
      }
    })();
  }, [userId]);

  // Listen for external open / settings change
  useEffect(() => {
    const onOpen = () => { setStepIdx(0); setActive(true); };
    const onToggle = (e: Event) => {
      const en = (e as CustomEvent).detail?.enabled;
      if (typeof en === "boolean") {
        setEnabled(en);
        if (en) {
          // Re-enable: clear completion so the tour can run again
          setCompleted(false);
          writeLocal({ mascotEnabled: en, completed: false });
        } else {
          writeLocal({ mascotEnabled: en });
          setActive(false);
        }
      }
    };
    window.addEventListener("nn:mascot-start", onOpen);
    window.addEventListener("nn:mascot-toggle", onToggle as any);
    return () => {
      window.removeEventListener("nn:mascot-start", onOpen);
      window.removeEventListener("nn:mascot-toggle", onToggle as any);
    };
  }, []);

  // Auto-start once for new users
  useEffect(() => {
    if (!enabled || completed || active) return;
    if (location.pathname !== "/") return;
    const t = setTimeout(() => setActive(true), 900);
    return () => clearTimeout(t);
  }, [enabled, completed, active, location.pathname]);

  // Find a target for the current step (skipping ones not on current route)
  useEffect(() => {
    if (!active) { setRect(null); return; }
    let attempts = 0;
    let raf = 0;
    const tick = () => {
      const step = STEPS[stepIdx];
      if (!step) { setRect(null); return; }
      if (step.routeMatch && !step.routeMatch(location.pathname)) {
        // skip to next applicable
        setStepIdx((i) => Math.min(i + 1, STEPS.length));
        return;
      }
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);
        // ensure visible
        const inView = r.top >= 0 && r.bottom <= window.innerHeight;
        if (!inView) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (attempts < 30) {
        attempts++;
        raf = requestAnimationFrame(tick);
      } else {
        setStepIdx((i) => Math.min(i + 1, STEPS.length));
      }
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => tick();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, stepIdx, location.pathname]);

  const finish = useCallback(async () => {
    setActive(false);
    setCompleted(true);
    writeLocal({ completed: true });
    if (userId) {
      await supabase.from("profiles").update({ tour_completed_at: new Date().toISOString() } as any).eq("user_id", userId);
    }
  }, [userId]);

  const next = useCallback(() => {
    if (stepIdx >= STEPS.length - 1) {
      finish();
    } else {
      setStepIdx((i) => i + 1);
    }
  }, [stepIdx, finish]);

  if (!enabled) return null;

  const step = STEPS[stepIdx];
  const showSpotlight = active && step && rect;

  return (
    <>
      {/* Spotlight overlay */}
      {showSpotlight && (
        <div className="fixed inset-0 z-[70] pointer-events-auto" onClick={next}>
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={Math.max(rect!.left - 10, 0)}
                  y={Math.max(rect!.top - 10, 0)}
                  width={rect!.width + 20}
                  height={rect!.height + 20}
                  rx={20}
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="hsl(var(--foreground))" fillOpacity="0.55" mask="url(#spotlight-mask)" />
          </svg>
          <div
            className="absolute pointer-events-none ring-2 ring-accent rounded-2xl"
            style={{ left: rect!.left - 10, top: rect!.top - 10, width: rect!.width + 20, height: rect!.height + 20 }}
          />

          {/* Tour card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute pointer-events-auto bg-card border border-border rounded-2xl shadow-elevated p-5 w-[88vw] max-w-sm"
            style={(() => {
              // Position below if room, else above
              const below = rect!.bottom + 20;
              const wantsBelow = below + 220 < window.innerHeight;
              const top = wantsBelow ? below : Math.max(rect!.top - 240, 16);
              const left = Math.min(Math.max(rect!.left + rect!.width / 2 - 180, 12), window.innerWidth - 372);
              return { top, left };
            })()}
          >
            <div className="flex items-start gap-3">
              <CompassMascot size={56} pointTo={{ x: rect!.left + rect!.width / 2, y: rect!.top + rect!.height / 2 }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-headline text-base font-bold text-headline">{isNo ? step.titleNo : step.titleEn}</h3>
                  <button onClick={finish} aria-label="Lukk" className="p-1 -mr-1 -mt-1 text-muted-foreground hover:text-foreground rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground font-body leading-snug mb-3">
                  {isNo ? step.bodyNo : step.bodyEn}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-subhead text-muted-foreground tabular-nums">
                    {stepIdx + 1} / {STEPS.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={finish} className="text-xs font-subhead text-muted-foreground hover:text-foreground px-2 py-1">
                      {isNo ? "Hopp over" : "Skip"}
                    </button>
                    <button onClick={next} className="inline-flex items-center gap-1 text-xs font-subhead font-semibold bg-accent text-accent-foreground px-3 py-1.5 rounded-full hover:bg-accent/90">
                      {stepIdx >= STEPS.length - 1 ? (isNo ? "Ferdig" : "Done") : (isNo ? "Neste" : "Next")}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating idle mascot */}
      {!active && (
        <button
          onClick={() => { setStepIdx(0); setActive(true); }}
          aria-label={isNo ? "Start guide" : "Start guide"}
          title={isNo ? "Vis guide" : "Show guide"}
          className="fixed bottom-5 right-5 z-50 group rounded-full p-1 bg-card shadow-elevated border border-border hover:scale-105 transition-transform"
        >
          <CompassMascot size={48} />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent ring-2 ring-card opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="sr-only"><Compass /></span>
          </span>
        </button>
      )}
    </>
  );
}