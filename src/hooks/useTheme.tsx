import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Theme = "light" | "dark";
type Language = "no" | "en";
type DefaultView = "search" | "feed" | "tall" | "hjernevelvet";

export type HideableElement = "search" | "feed" | "tall" | "hjernevelvet" | "job_changes";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: () => void;
  defaultView: DefaultView;
  setDefaultView: (view: DefaultView) => void;
  hasOnboarded: boolean;
  completeOnboarding: () => void;
  region: string | null;
  setRegion: (region: string) => void;
  hiddenElements: HideableElement[];
  toggleHiddenElement: (element: HideableElement) => void;
  resetAllSettings: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) || "light";
    }
    return "light";
  });

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("language") as Language) || "no";
    }
    return "no";
  });

  const [defaultView, setDefaultViewState] = useState<DefaultView>(() => {
    if (typeof window !== "undefined") {
      // Avisa først: lesere som aldri har valgt startside lander i nyhetsfeeden.
      // Eksplisitte valg (onboarding/stjerne-menyen) ligger i localStorage og vinner.
      return (localStorage.getItem("defaultView") as DefaultView) || "feed";
    }
    return "feed";
  });

  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hasOnboarded") === "true";
    }
    return false;
  });

  const [region, setRegionState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("region") || null;
    }
    return null;
  });

  const [hiddenElements, setHiddenElements] = useState<HideableElement[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("hiddenElements") || "[]");
      } catch { return []; }
    }
    return [];
  });

  // Track if we've loaded from DB to avoid overwriting with localStorage defaults
  const dbLoadedRef = useRef(false);

  // Sync hidden_elements FROM database on login
  useEffect(() => {
    const loadFromDb = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("hidden_elements")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data?.hidden_elements && Array.isArray(data.hidden_elements)) {
        setHiddenElements(data.hidden_elements as HideableElement[]);
        localStorage.setItem("hiddenElements", JSON.stringify(data.hidden_elements));
      }
      dbLoadedRef.current = true;
    };
    loadFromDb();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadFromDb();
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync hidden_elements TO database when changed
  const syncToDb = async (elements: HideableElement[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("profiles")
      .update({ hidden_elements: elements } as any)
      .eq("user_id", session.user.id);
  };

  const completeOnboarding = () => {
    setHasOnboarded(true);
    localStorage.setItem("hasOnboarded", "true");
  };

  const setRegion = (r: string) => {
    setRegionState(r);
    localStorage.setItem("region", r);
  };

  const toggleHiddenElement = (element: HideableElement) => {
    setHiddenElements(prev => {
      const next = prev.includes(element) ? prev.filter(e => e !== element) : [...prev, element];
      localStorage.setItem("hiddenElements", JSON.stringify(next));
      syncToDb(next);
      return next;
    });
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "no" ? "en" : "no"));
  };

  const setDefaultView = (view: DefaultView) => {
    setDefaultViewState(view);
    localStorage.setItem("defaultView", view);
  };

  const resetAllSettings = () => {
    setTheme("light");
    setLanguage("no");
    setDefaultViewState("feed");
    setHiddenElements([]);
    setRegionState(null);
    localStorage.setItem("theme", "light");
    localStorage.setItem("language", "no");
    localStorage.setItem("defaultView", "feed");
    localStorage.setItem("hiddenElements", "[]");
    localStorage.removeItem("region");
    syncToDb([]);
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add("light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, language, toggleLanguage, defaultView, setDefaultView, hasOnboarded, completeOnboarding, region, setRegion, hiddenElements, toggleHiddenElement, resetAllSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
