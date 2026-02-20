import { useState } from "react";
import { Menu, X, Search, Moon, Sun, Globe } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";

interface HeaderProps {
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function Header({ showSearch = true, onSearchClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, language, toggleLanguage } = useTheme();
  const t = translations[language];

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-warm rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-headline font-bold text-lg">S</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-lg font-bold text-headline leading-none">
                {t.brandName}
              </span>
              <span className="font-subhead text-xs text-accent tracking-wide">
                {t.brandSub}
              </span>
            </div>
          </a>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2.5 hover:bg-secondary rounded-full transition-colors flex items-center gap-1.5"
              title={language === "no" ? "Switch to English" : "Bytt til norsk"}
            >
              <Globe className="w-4 h-4 text-foreground/70" />
              <span className="text-xs font-medium text-foreground/70 uppercase">{language}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 hover:bg-secondary rounded-full transition-colors"
              title={theme === "light" ? "Dark mode" : "Light mode"}
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4 text-foreground/70" />
              ) : (
                <Sun className="w-4 h-4 text-foreground/70" />
              )}
            </button>

            {showSearch && (
              <button
                onClick={onSearchClick}
                className="p-2.5 hover:bg-secondary rounded-full transition-colors"
              >
                <Search className="w-5 h-5 text-foreground/70" />
              </button>
            )}
            <button className="hidden md:block px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
              {t.subscribe}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2.5 hover:bg-secondary rounded-full transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-2">
              <button className="w-full px-5 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors">
                {t.subscribe}
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
