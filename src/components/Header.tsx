import { useState, useEffect } from "react";
import logoImg from "@/assets/logo.png";
import { Menu, X, Search, Moon, Sun, Globe, Users, LogIn, LogOut, UserCircle, Shield, Brain, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SubscriptionStatusBadge } from "@/components/SubscriptionStatusBadge";
import { SubscriptionTrialBanner } from "@/components/SubscriptionTrialBanner";

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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async (uid: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      setIsAdmin(!!data && data.length > 0);
    };

    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setUserEmail(data.session?.user?.email ?? null);
      if (data.session?.user?.id) checkRole(data.session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
      if (session?.user?.id) {
        checkRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(language === "no" ? "Logget ut" : "Logged out");
  };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <SubscriptionTrialBanner />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={logoImg} alt="Nær Næring" className="w-9 h-9 sm:w-10 sm:h-10 object-contain dark:bg-white dark:rounded-full dark:p-0.5 shrink-0" width={40} height={40} />
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-base sm:text-lg font-bold text-headline leading-none truncate">
                {t.brandName}
              </span>
              <span className="font-subhead text-[10px] sm:text-xs text-accent tracking-wide truncate">
                {t.brandSub}
              </span>
            </div>
          </a>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop-only secondary actions */}
            <button
              onClick={toggleLanguage}
              className="hidden md:flex p-2.5 hover:bg-secondary rounded-full transition-colors items-center gap-1.5"
              title={language === "no" ? "Switch to English" : "Bytt til norsk"}
            >
              <Globe className="w-4 h-4 text-foreground/70" />
              <span className="text-xs font-medium text-foreground/70 uppercase">{language}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="hidden md:inline-flex p-2.5 hover:bg-secondary rounded-full transition-colors"
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
                className="p-2 sm:p-2.5 hover:bg-secondary rounded-full transition-colors"
              >
                <Search className="w-5 h-5 text-foreground/70" />
              </button>
            )}

            <button onClick={() => navigate("/hjernetrim")} className="hidden md:inline-flex p-2.5 hover:bg-secondary rounded-full transition-colors" title={language === "no" ? "Hjernetrim" : "Brain games"}>
              <Brain className="w-4 h-4 text-foreground/70" />
            </button>

            <button onClick={() => navigate("/grupper")} className="hidden md:inline-flex p-2.5 hover:bg-secondary rounded-full transition-colors" title={language === "no" ? "Grupper" : "Groups"}>
              <Users className="w-4 h-4 text-foreground/70" />
            </button>

            <button onClick={() => navigate("/stillinger")} className="hidden md:inline-flex p-2.5 hover:bg-secondary rounded-full transition-colors" title={language === "no" ? "Stillinger" : "Jobs"}>
              <Briefcase className="w-4 h-4 text-foreground/70" />
            </button>

            {userId ? (
              <div className="hidden md:flex items-center gap-1">
                <SubscriptionStatusBadge />
                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="p-2.5 hover:bg-secondary rounded-full transition-colors"
                    title="Admin"
                  >
                    <Shield className="w-4 h-4 text-foreground/70" />
                  </button>
                )}
                <button
                  onClick={() => navigate("/profil")}
                  className="p-2.5 hover:bg-secondary rounded-full transition-colors"
                  title={language === "no" ? "Min profil" : "My profile"}
                >
                  <UserCircle className="w-4 h-4 text-foreground/70" />
                </button>
                <span className="hidden lg:block text-xs font-body text-muted-foreground max-w-[120px] truncate">
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
              className="md:hidden p-2 sm:p-2.5 hover:bg-secondary rounded-full transition-colors"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
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
            <nav className="flex flex-col gap-1">
              {/* Navigation links */}
              <button onClick={() => { navigate("/stillinger"); setIsMobileMenuOpen(false); }} className="w-full px-4 py-3 text-left rounded-xl hover:bg-secondary transition-colors flex items-center gap-3 font-subhead text-sm">
                <Briefcase className="w-4 h-4 text-foreground/70" />
                {language === "no" ? "Stillinger" : "Jobs"}
              </button>
              <button onClick={() => { navigate("/grupper"); setIsMobileMenuOpen(false); }} className="w-full px-4 py-3 text-left rounded-xl hover:bg-secondary transition-colors flex items-center gap-3 font-subhead text-sm">
                <Users className="w-4 h-4 text-foreground/70" />
                {language === "no" ? "Grupper" : "Groups"}
              </button>
              <button onClick={() => { navigate("/hjernetrim"); setIsMobileMenuOpen(false); }} className="w-full px-4 py-3 text-left rounded-xl hover:bg-secondary transition-colors flex items-center gap-3 font-subhead text-sm">
                <Brain className="w-4 h-4 text-foreground/70" />
                {language === "no" ? "Hjernetrim" : "Brain games"}
              </button>

              <div className="h-px bg-border my-2" />

              {/* Settings */}
              <div className="flex items-center gap-2 px-2">
                <button
                  onClick={toggleLanguage}
                  className="flex-1 px-4 py-3 rounded-xl hover:bg-secondary transition-colors flex items-center justify-center gap-2 font-subhead text-sm"
                >
                  <Globe className="w-4 h-4 text-foreground/70" />
                  <span className="uppercase">{language === "no" ? "EN" : "NO"}</span>
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex-1 px-4 py-3 rounded-xl hover:bg-secondary transition-colors flex items-center justify-center gap-2 font-subhead text-sm"
                >
                  {theme === "light" ? <Moon className="w-4 h-4 text-foreground/70" /> : <Sun className="w-4 h-4 text-foreground/70" />}
                  {theme === "light" ? (language === "no" ? "Mørk" : "Dark") : (language === "no" ? "Lys" : "Light")}
                </button>
              </div>

              <div className="h-px bg-border my-2" />

              {userId ? (
                <>
                  {userEmail && (
                    <div className="px-4 pb-2 text-xs text-muted-foreground truncate">
                      {userEmail}
                    </div>
                  )}
                  <div className="px-2"><SubscriptionStatusBadge /></div>
                  {isAdmin && (
                    <button onClick={() => { navigate("/admin"); setIsMobileMenuOpen(false); }} className="w-full mt-2 px-5 py-3 bg-primary text-primary-foreground rounded-full font-subhead text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </button>
                  )}
                  <button onClick={() => { navigate("/profil"); setIsMobileMenuOpen(false); }} className="w-full mt-2 px-5 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2">
                    <UserCircle className="w-4 h-4" />
                    {language === "no" ? "Min profil" : "My profile"}
                  </button>
                  <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full mt-2 px-5 py-3 bg-secondary text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4" />
                    {language === "no" ? "Logg ut" : "Log out"}
                  </button>
                </>
              ) : (
                <button onClick={() => { navigate("/login"); setIsMobileMenuOpen(false); }} className="w-full px-5 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
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
