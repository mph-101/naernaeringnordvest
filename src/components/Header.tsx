import { useState } from "react";
import { Menu, X, Search } from "lucide-react";

interface HeaderProps {
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function Header({ showSearch = true, onSearchClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                Sport Business
              </span>
              <span className="font-subhead text-xs text-accent tracking-wide">
                Journal
              </span>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="font-body text-sm text-foreground/70 hover:text-foreground transition-colors">
              Transactions
            </a>
            <a href="#" className="font-body text-sm text-foreground/70 hover:text-foreground transition-colors">
              Leagues
            </a>
            <a href="#" className="font-body text-sm text-foreground/70 hover:text-foreground transition-colors">
              Media & Rights
            </a>
            <a href="#" className="font-body text-sm text-foreground/70 hover:text-foreground transition-colors">
              Valuations
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {showSearch && (
              <button
                onClick={onSearchClick}
                className="p-2.5 hover:bg-secondary rounded-full transition-colors"
              >
                <Search className="w-5 h-5 text-foreground/70" />
              </button>
            )}
            <button className="hidden md:block px-5 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
              Subscribe
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
              <a href="#" className="font-body text-sm text-foreground/70 hover:text-foreground transition-colors py-3 px-3 hover:bg-secondary rounded-xl">
                Transactions
              </a>
              <a href="#" className="font-body text-sm text-foreground/70 hover:text-foreground transition-colors py-3 px-3 hover:bg-secondary rounded-xl">
                Leagues
              </a>
              <a href="#" className="font-body text-sm text-foreground/70 hover:text-foreground transition-colors py-3 px-3 hover:bg-secondary rounded-xl">
                Media & Rights
              </a>
              <a href="#" className="font-body text-sm text-foreground/70 hover:text-foreground transition-colors py-3 px-3 hover:bg-secondary rounded-xl">
                Valuations
              </a>
              <button className="w-full px-5 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors mt-2">
                Subscribe
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
