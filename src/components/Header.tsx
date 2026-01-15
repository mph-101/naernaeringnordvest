import { useState } from "react";
import { Menu, X, Search } from "lucide-react";

interface HeaderProps {
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function Header({ showSearch = true, onSearchClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <h1 className="font-editorial text-xl font-semibold text-headline">
              The Dispatch
            </h1>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-body text-foreground/70 hover:text-foreground transition-colors">
              Latest
            </a>
            <a href="#" className="text-sm font-body text-foreground/70 hover:text-foreground transition-colors">
              Topics
            </a>
            <a href="#" className="text-sm font-body text-foreground/70 hover:text-foreground transition-colors">
              Podcasts
            </a>
            <a href="#" className="text-sm font-body text-foreground/70 hover:text-foreground transition-colors">
              Video
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {showSearch && (
              <button
                onClick={onSearchClick}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <Search className="w-5 h-5 text-foreground" />
              </button>
            )}
            <button className="hidden md:block px-4 py-2 bg-primary text-primary-foreground rounded-lg font-body text-sm font-medium hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
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
            <nav className="flex flex-col gap-4">
              <a href="#" className="text-base font-body text-foreground/70 hover:text-foreground transition-colors">
                Latest
              </a>
              <a href="#" className="text-base font-body text-foreground/70 hover:text-foreground transition-colors">
                Topics
              </a>
              <a href="#" className="text-base font-body text-foreground/70 hover:text-foreground transition-colors">
                Podcasts
              </a>
              <a href="#" className="text-base font-body text-foreground/70 hover:text-foreground transition-colors">
                Video
              </a>
              <button className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-body text-sm font-medium hover:bg-primary/90 transition-colors mt-2">
                Subscribe
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
