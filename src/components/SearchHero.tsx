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
    <div className="flex flex-col items-center justify-center min-h-[55vh] px-6 animate-fade-up">
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5 text-headline leading-tight">
          <span className="inline-block animate-fade-up" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
            {t.heroTitle1}
          </span>
          <br />
          <span className="inline-block text-accent animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
            {t.heroTitle2}
          </span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground font-body leading-relaxed max-w-lg mx-auto animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          {t.heroSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xl mb-8">
        <div className="relative group">
          <div className="relative bg-card border border-border rounded-2xl shadow-soft group-focus-within:border-accent group-focus-within:shadow-elevated transition-all duration-200">
            <div className="flex items-center px-5 py-4">
              <Search className="w-5 h-5 text-muted-foreground mr-4 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
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

      <div className="w-full max-w-xl">
        <p className="font-subhead text-sm text-muted-foreground mb-4 text-center">
          {t.popularQuestions}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {t.examplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handlePromptClick(prompt)}
              className="px-4 py-2.5 bg-card hover:bg-secondary border border-border rounded-full text-sm font-body text-foreground/80 hover:text-foreground transition-all duration-200 hover:shadow-soft hover:border-accent/30"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
