import { useState, useEffect } from "react";
import { Menu, X, Search, Moon, Sun, Globe, Users, LogIn, LogOut, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HeaderProps {
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function Header({ showSearch = true, onSearchClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, language, toggleLanguage } = useTheme();
  const navigate = useNavigate();
  const t = translations[language];
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setUserEmail(data.session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(language === "no" ? "Logget ut" : "Logged out");
  };

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
            <button
              onClick={toggleLanguage}
              className="p-2.5 hover:bg-secondary rounded-full transition-colors flex items-center gap-1.5"
              title={language === "no" ? "Switch to English" : "Bytt til norsk"}
            >
              <Globe className="w-4 h-4 text-foreground/70" />
              <span className="text-xs font-medium text-foreground/70 uppercase">{language}</span>
            </button>

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

            <button onClick={() => navigate("/grupper")} className="p-2.5 hover:bg-secondary rounded-full transition-colors" title={language === "no" ? "Grupper" : "Groups"}>
              <Users className="w-4 h-4 text-foreground/70" />
            </button>

            {userId ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate("/profil")}
                  className="p-2.5 hover:bg-secondary rounded-full transition-colors"
                  title={language === "no" ? "Min profil" : "My profile"}
                >
                  <UserCircle className="w-4 h-4 text-foreground/70" />
                </button>
                <span className="hidden md:block text-xs font-body text-muted-foreground max-w-[120px] truncate">
                  {userEmail}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2.5 hover:bg-secondary rounded-full transition-colors"
                  title={language === "no" ? "Logg ut" : "Log out"}
                >
                  <LogOut className="w-4 h-4 text-foreground/70" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft"
              >
                <LogIn className="w-4 h-4" />
                {language === "no" ? "Logg inn" : "Log in"}
              </button>
            )}

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
              {userId ? (
                <>
                  <button onClick={() => { navigate("/profil"); setIsMobileMenuOpen(false); }} className="w-full px-5 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors">
                    {language === "no" ? "Min profil" : "My profile"}
                  </button>
                  <button onClick={handleLogout} className="w-full px-5 py-3 bg-secondary text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary/80 transition-colors">
                    {language === "no" ? "Logg ut" : "Log out"}
                  </button>
                </>
              ) : (
                <button onClick={() => { navigate("/login"); setIsMobileMenuOpen(false); }} className="w-full px-5 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors">
                  {language === "no" ? "Logg inn" : "Log in"}
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
