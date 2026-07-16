import { useState, useEffect } from "react";
// Logo served from public/ — works in both Vite and Next.js
const logoImg = "/logo.png";
import { Menu, X, Search, Moon, Sun, Globe, Users, LogIn, LogOut, UserCircle, Shield, Brain, Briefcase, CalendarDays, MapPin, ChevronDown, AtSign } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useRegion } from "@/hooks/useRegion";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SubscriptionStatusBadge } from "@/components/SubscriptionStatusBadge";
import { SubscriptionTrialBanner } from "@/components/SubscriptionTrialBanner";
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function Header({ showSearch = true, onSearchClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, language, toggleLanguage } = useTheme();
  const { current: currentRegion, all: regions, switchRegion } = useRegion();
  const t = translations[language];
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [publicUsername, setPublicUsername] = useState<string | null>(null);
  const otherRegions = regions.filter((r) => r.slug !== "nasjonal" && r.slug !== currentRegion?.slug);

  useEffect(() => {
    const checkRole = async (uid: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      const roles = (data || []).map((r: any) => r.role as string);
      setIsAdmin(roles.length > 0);
      // Public profile is available for journalists/contributors/editors
      const hasPublicRole = roles.some((r) => ["journalist", "contributor", "editor"].includes(r));
      if (hasPublicRole) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", uid)
          .maybeSingle();
        setPublicUsername((profile as any)?.username || null);
      } else {
        setPublicUsername(null);
      }
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
        setPublicUsername(null);
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
              <span className="font-subhead text-[0.625rem] sm:text-xs text-accent-ink tracking-wide truncate">
                {currentRegion && currentRegion.slug !== "nasjonal" ? currentRegion.name : t.brandSub}
              </span>
            </div>
          </a>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Region-velger: Radix DropdownMenu gir tastaturnavigasjon,
                Escape og korrekte menu-roller gratis (den håndrullede
                varianten lukket på blur før tastaturet rakk inn i listen) */}
            {otherRegions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="hidden md:flex items-center gap-1 px-2.5 min-h-10 hover:bg-secondary rounded-full transition-colors"
                    title={language === "no" ? "Bytt region" : "Switch region"}
                    aria-label={language === "no" ? "Bytt region" : "Switch region"}
                  >
                    <MapPin className="w-3.5 h-3.5 text-foreground/70" />
                    <span className="text-xs font-medium text-foreground/80">{currentRegion?.name}</span>
                    <ChevronDown className="w-3 h-3 text-foreground/70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  {otherRegions.map((r) => (
                    <DropdownMenuItem key={r.slug} onClick={() => switchRegion(r.slug)}>
                      {r.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button
              onClick={toggleLanguage}
              className="hidden md:flex min-w-10 min-h-10 px-2.5 hover:bg-secondary rounded-full transition-colors items-center justify-center gap-1.5"
              title={language === "no" ? "Switch to English" : "Bytt til norsk"}
              aria-label={language === "no" ? "Switch to English" : "Bytt til norsk"}
            >
              <Globe className="w-4 h-4 text-foreground/70" />
              <span className="text-xs font-medium text-foreground/80 uppercase">{language}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="hidden md:inline-flex min-w-10 min-h-10 items-center justify-center hover:bg-secondary rounded-full transition-colors"
              title={theme === "light" ? "Dark mode" : "Light mode"}
              aria-label={theme === "light" ? "Dark mode" : "Light mode"}
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
                className="min-w-10 min-h-10 inline-flex items-center justify-center hover:bg-secondary rounded-full transition-colors"
                aria-label={language === "no" ? "Søk" : "Search"}
              >
                <Search className="w-5 h-5 text-foreground/70" />
              </button>
            )}

            <Link to="/hjernetrim" className="hidden md:inline-flex min-w-10 min-h-10 items-center justify-center hover:bg-secondary rounded-full transition-colors" title={language === "no" ? "Hjernetrim" : "Brain games"} aria-label={language === "no" ? "Hjernetrim" : "Brain games"}>
              <Brain className="w-4 h-4 text-foreground/70" />
            </Link>

            <Link data-tour="nav-groups" to="/grupper" className="hidden md:inline-flex min-w-10 min-h-10 items-center justify-center hover:bg-secondary rounded-full transition-colors" title={language === "no" ? "Grupper" : "Groups"} aria-label={language === "no" ? "Grupper" : "Groups"}>
              <Users className="w-4 h-4 text-foreground/70" />
            </Link>

            <Link data-tour="nav-jobs" to="/stillinger" className="hidden md:inline-flex min-w-10 min-h-10 items-center justify-center hover:bg-secondary rounded-full transition-colors" title={language === "no" ? "Stillinger" : "Jobs"} aria-label={language === "no" ? "Stillinger" : "Jobs"}>
              <Briefcase className="w-4 h-4 text-foreground/70" />
            </Link>

            <Link to="/arrangementer" className="hidden md:inline-flex min-w-10 min-h-10 items-center justify-center hover:bg-secondary rounded-full transition-colors" title={language === "no" ? "Arrangementer" : "Events"} aria-label={language === "no" ? "Arrangementer" : "Events"}>
              <CalendarDays className="w-4 h-4 text-foreground/70" />
            </Link>

            {userId && <NotificationBell />}

            {userId ? (
              <div className="hidden md:flex items-center gap-1">
                <SubscriptionStatusBadge />
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="min-w-10 min-h-10 inline-flex items-center justify-center hover:bg-secondary rounded-full transition-colors"
                    title="Admin"
                    aria-label="Admin"
                  >
                    <Shield className="w-4 h-4 text-foreground/70" />
                  </Link>
                )}
                {publicUsername && (
                  <Link
                    to={`/@${publicUsername}`}
                    className="min-w-10 min-h-10 inline-flex items-center justify-center hover:bg-secondary rounded-full transition-colors"
                    title={language === "no" ? `Min offentlige profil (@${publicUsername})` : `My public profile (@${publicUsername})`}
                    aria-label={language === "no" ? `Min offentlige profil (@${publicUsername})` : `My public profile (@${publicUsername})`}
                  >
                    <AtSign className="w-4 h-4 text-foreground/70" />
                  </Link>
                )}
                <Link
                  to="/profil"
                  className="min-w-10 min-h-10 inline-flex items-center justify-center hover:bg-secondary rounded-full transition-colors"
                  title={language === "no" ? "Min profil" : "My profile"}
                  aria-label={language === "no" ? "Min profil" : "My profile"}
                >
                  <UserCircle className="w-4 h-4 text-foreground/70" />
                </Link>
                <span className="hidden lg:block text-xs font-body text-muted-foreground max-w-[120px] truncate">
                  {userEmail}
                </span>
                <button
                  onClick={handleLogout}
                  className="min-w-10 min-h-10 inline-flex items-center justify-center hover:bg-secondary rounded-full transition-colors"
                  title={language === "no" ? "Logg ut" : "Log out"}
                  aria-label={language === "no" ? "Logg ut" : "Log out"}
                >
                  <LogOut className="w-4 h-4 text-foreground/70" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft"
              >
                <LogIn className="w-4 h-4" />
                {language === "no" ? "Logg inn" : "Log in"}
              </Link>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden min-w-10 min-h-10 inline-flex items-center justify-center hover:bg-secondary rounded-full transition-colors"
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
          /* max-h + scroll: i telefon-landskap er menyen høyere enn viewporten,
             og sticky-headeren gjorde nederste halvdel unåelig (re-audit P1) */
          <div className="md:hidden py-4 border-t border-border animate-fade-in max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
            <nav className="flex flex-col gap-1">
              {/* Navigation links */}
              <Link to="/stillinger" onClick={() => setIsMobileMenuOpen(false)} className="w-full px-4 py-3 text-left rounded-xl hover:bg-secondary transition-colors flex items-center gap-3 font-subhead text-sm">
                <Briefcase className="w-4 h-4 text-foreground/70" />
                {language === "no" ? "Stillinger" : "Jobs"}
              </Link>
              <Link to="/grupper" onClick={() => setIsMobileMenuOpen(false)} className="w-full px-4 py-3 text-left rounded-xl hover:bg-secondary transition-colors flex items-center gap-3 font-subhead text-sm">
                <Users className="w-4 h-4 text-foreground/70" />
                {language === "no" ? "Grupper" : "Groups"}
              </Link>
              <Link to="/arrangementer" onClick={() => setIsMobileMenuOpen(false)} className="w-full px-4 py-3 text-left rounded-xl hover:bg-secondary transition-colors flex items-center gap-3 font-subhead text-sm">
                <CalendarDays className="w-4 h-4 text-foreground/70" />
                {language === "no" ? "Arrangementer" : "Events"}
              </Link>
              <Link to="/hjernetrim" onClick={() => setIsMobileMenuOpen(false)} className="w-full px-4 py-3 text-left rounded-xl hover:bg-secondary transition-colors flex items-center gap-3 font-subhead text-sm">
                <Brain className="w-4 h-4 text-foreground/70" />
                {language === "no" ? "Hjernetrim" : "Brain games"}
              </Link>

              {/* Region-bytte må også finnes på mobil — feeden filtreres på
                  aktiv region, og FirstVisitBanner er engangs */}
              {otherRegions.length > 0 && (
                <>
                  <div className="h-px bg-border my-2" />
                  <p className="px-4 pb-1 text-xs font-subhead text-muted-foreground">
                    {language === "no" ? "Bytt region" : "Switch region"}
                  </p>
                  {otherRegions.map((r) => (
                    <button
                      key={r.slug}
                      onClick={() => { switchRegion(r.slug); setIsMobileMenuOpen(false); }}
                      className="w-full px-4 py-3 text-left rounded-xl hover:bg-secondary transition-colors flex items-center gap-3 font-subhead text-sm"
                    >
                      <MapPin className="w-4 h-4 text-foreground/70" />
                      {r.name}
                    </button>
                  ))}
                </>
              )}

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
                    <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="w-full mt-2 px-5 py-3 bg-primary text-primary-foreground rounded-full font-subhead text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  <Link to="/profil" onClick={() => setIsMobileMenuOpen(false)} className="w-full mt-2 px-5 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2">
                    <UserCircle className="w-4 h-4" />
                    {language === "no" ? "Min profil" : "My profile"}
                  </Link>
                  <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full mt-2 px-5 py-3 bg-secondary text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4" />
                    {language === "no" ? "Logg ut" : "Log out"}
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full px-5 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
                  {language === "no" ? "Logg inn" : "Log in"}
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
