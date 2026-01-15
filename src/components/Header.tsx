import { useState } from "react";
import { Menu, X, Search } from "lucide-react";

interface HeaderProps {
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function Header({ showSearch = true, onSearchClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-headline text-lg font-bold text-headline tracking-tight leading-none">
                Sport Business
              </span>
              <span className="font-subhead text-[10px] font-semibold text-accent tracking-widest uppercase">
                Journal
              </span>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="font-subhead text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              Transactions
            </a>
            <a href="#" className="font-subhead text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              Leagues
            </a>
            <a href="#" className="font-subhead text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              Media & Rights
            </a>
            <a href="#" className="font-subhead text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              Valuations
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {showSearch && (
              <button
                onClick={onSearchClick}
                className="p-2 hover:bg-secondary rounded-sm transition-colors"
              >
                <Search className="w-5 h-5 text-foreground/70" />
              </button>
            )}
            <button className="hidden md:block px-4 py-2 bg-accent text-accent-foreground rounded-sm font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors">
              Subscribe
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-sm transition-colors"
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
            <nav className="flex flex-col gap-3">
              <a href="#" className="font-subhead text-sm font-medium text-foreground/70 hover:text-foreground transition-colors py-2">
                Transactions
              </a>
              <a href="#" className="font-subhead text-sm font-medium text-foreground/70 hover:text-foreground transition-colors py-2">
                Leagues
              </a>
              <a href="#" className="font-subhead text-sm font-medium text-foreground/70 hover:text-foreground transition-colors py-2">
                Media & Rights
              </a>
              <a href="#" className="font-subhead text-sm font-medium text-foreground/70 hover:text-foreground transition-colors py-2">
                Valuations
              </a>
              <button className="w-full px-4 py-3 bg-accent text-accent-foreground rounded-sm font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors mt-2">
                Subscribe
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
