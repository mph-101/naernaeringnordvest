import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { FOOTER_PAGE_LINKS } from "@/lib/footer-pages";

/**
 * Shared site footer with brand block, navigation to legal/info pages,
 * and an impressum line covering Compass Media and editorial responsibility.
 */
export const SiteFooter = () => {
  const { language } = useTheme();
  const t = translations[language];
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 mt-16">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="text-center md:text-left max-w-sm">
            <h2 className="font-headline text-xl font-bold text-headline mb-1.5">
              {t.brandName}
            </h2>
            <p className="text-sm text-muted-foreground font-body">
              {t.footerTagline}
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-sm font-body text-muted-foreground"
          >
            <Link to="/team" className="hover:text-foreground transition-colors">
              Redaksjonen
            </Link>
            {FOOTER_PAGE_LINKS.map((l) => (
              <Link
                key={l.slug}
                to={`/${l.slug}`}
                className="hover:text-foreground transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 text-xs font-body text-muted-foreground leading-relaxed space-y-1">
          <p>
            <strong className="text-foreground/80 font-semibold">Nær Næring Nordvest</strong> utgis av Compass Media, Molde. Ansvarlig redaktør og daglig leder: Magnus Peter Harnes.
          </p>
          <p>
            Medlem av MBL og Norsk Redaktørforening. Tilsluttet PFU. Arbeider etter Vær Varsom-plakaten og Redaktørplakaten.
          </p>
          <p>© Compass Media {year}. Materialet er vernet etter åndsverkloven.</p>
        </div>
      </div>
    </footer>
  );
};