import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";

interface SearchHeroProps {
  onSearch: (query: string) => void;
}

export function SearchHero({ onSearch }: SearchHeroProps) {
  const [query, setQuery] = useState("");
  const { language } = useTheme();
  const t = translations[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setQuery(prompt);
    onSearch(prompt);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 pt-8 pb-16">
      {/* Headline */}
      <div className="text-center mb-12 max-w-2xl">
        <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-headline leading-[1.1]">
          <span className="inline-block animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            {t.heroTitle1}
          </span>
          <br />
          <span className="inline-block text-accent-ink animate-fade-up" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
            {t.heroTitle2}
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-body leading-relaxed max-w-lg mx-auto animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          {t.heroSubtitle}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="w-full max-w-xl mb-10 animate-fade-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
        <div className="relative group">
          <div className="relative bg-card border-2 border-border rounded-2xl shadow-elevated group-focus-within:border-accent group-focus-within:shadow-elevated transition-all duration-300">
            <div className="flex items-center px-5 py-4">
              <Search className="w-5 h-5 text-muted-foreground mr-4 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                className="flex-1 bg-transparent outline-none text-base font-body text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="ml-3 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-subhead text-sm font-semibold flex items-center gap-2 shadow-soft"
              >
                <span className="hidden sm:inline">{t.askButton}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Prompts */}
      <div className="w-full max-w-xl animate-fade-up" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
        <p className="font-subhead text-xs text-muted-foreground mb-3 text-center uppercase tracking-widest">
          {t.popularQuestions}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {t.examplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handlePromptClick(prompt)}
              className="px-4 py-2 bg-card hover:bg-secondary border border-border rounded-full text-sm font-body text-foreground/80 hover:text-foreground transition-all duration-200 hover:shadow-soft hover:border-accent/30"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
