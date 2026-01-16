import { Header } from "@/components/Header";
import { TeamSection } from "@/components/TeamSection";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";

const Team = () => {
  const { language } = useTheme();
  const t = translations[language];

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      
      <main className="pt-8">
        <TeamSection />
      </main>

      <footer className="border-t border-border py-12 mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="font-headline text-lg font-medium text-headline mb-1">
                {t.brandName}
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                {t.footerTagline}
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm font-body text-muted-foreground">
              <a href="/team" className="hover:text-foreground transition-colors">{t.footerAbout}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerContact}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerPrivacy}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerTerms}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Team;
