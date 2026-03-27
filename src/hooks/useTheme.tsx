import { useState, useEffect, createContext, useContext, ReactNode } from "react";

type Theme = "light" | "dark";
type Language = "no" | "en";
type DefaultView = "search" | "feed" | "tall";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: () => void;
  defaultView: DefaultView;
  setDefaultView: (view: DefaultView) => void;
  hasOnboarded: boolean;
  completeOnboarding: () => void;
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

  const completeOnboarding = () => {
    setHasOnboarded(true);
    localStorage.setItem("hasOnboarded", "true");
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

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, language, toggleLanguage, defaultView, setDefaultView, hasOnboarded, completeOnboarding }}>
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
