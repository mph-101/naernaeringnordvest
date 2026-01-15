import { useState } from "react";
import { Menu, X, Search } from "lucide-react";

interface HeaderProps {
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function Header({ showSearch = true, onSearchClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-primary border-b-4 border-accent">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="bg-accent px-2 py-1">
              <span className="font-headline text-sm font-bold text-accent-foreground tracking-wider">SPORT</span>
            </div>
            <h1 className="font-headline text-xl font-bold text-primary-foreground tracking-tight">
              BUSINESS WIRE
            </h1>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="font-subhead text-xs font-semibold text-primary-foreground/70 hover:text-primary-foreground transition-colors">
              Deals
            </a>
            <a href="#" className="font-subhead text-xs font-semibold text-primary-foreground/70 hover:text-primary-foreground transition-colors">
              Leagues
            </a>
            <a href="#" className="font-subhead text-xs font-semibold text-primary-foreground/70 hover:text-primary-foreground transition-colors">
              Media Rights
            </a>
            <a href="#" className="font-subhead text-xs font-semibold text-primary-foreground/70 hover:text-primary-foreground transition-colors">
              Franchises
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {showSearch && (
              <button
                onClick={onSearchClick}
                className="p-2 hover:bg-primary-foreground/10 rounded transition-colors"
              >
                <Search className="w-5 h-5 text-primary-foreground" />
              </button>
            )}
            <button className="hidden md:block px-4 py-2 bg-accent text-accent-foreground rounded font-subhead text-xs font-bold tracking-wider hover:bg-accent/90 transition-colors">
              Subscribe
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-primary-foreground/10 rounded transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-primary-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-primary-foreground/20 animate-fade-in">
            <nav className="flex flex-col gap-3">
              <a href="#" className="font-subhead text-sm font-semibold text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Deals
              </a>
              <a href="#" className="font-subhead text-sm font-semibold text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Leagues
              </a>
              <a href="#" className="font-subhead text-sm font-semibold text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Media Rights
              </a>
              <a href="#" className="font-subhead text-sm font-semibold text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Franchises
              </a>
              <button className="w-full px-4 py-3 bg-accent text-accent-foreground rounded font-subhead text-sm font-bold tracking-wider hover:bg-accent/90 transition-colors mt-2">
                Subscribe
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
