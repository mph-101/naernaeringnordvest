import { useState, useEffect, createContext, useContext, ReactNode } from "react";

type Theme = "light" | "dark";
type Language = "no" | "en";
type DefaultView = "search" | "feed" | "tall";

export type HideableElement = "search" | "feed" | "tall" | "job_changes";

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
      return (localStorage.getItem("defaultView") as DefaultView) || "search";
    }
    return "search";
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
    setDefaultViewState("search");
    setHiddenElements([]);
    setRegionState(null);
    localStorage.setItem("theme", "light");
    localStorage.setItem("language", "no");
    localStorage.setItem("defaultView", "search");
    localStorage.setItem("hiddenElements", "[]");
    localStorage.removeItem("region");
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
