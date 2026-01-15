import { useState } from "react";
import { Search, ArrowRight, TrendingUp } from "lucide-react";

interface SearchHeroProps {
  onSearch: (query: string) => void;
}

const examplePrompts = [
  "What's the latest on NBA media rights negotiations?",
  "How is private equity reshaping European football?",
  "Which sports franchises sold this year and for how much?",
  "What are the projections for the esports market?",
];

export function SearchHero({ onSearch }: SearchHeroProps) {
  const [query, setQuery] = useState("");

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
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-up">
      <div className="text-center mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded mb-6">
          <TrendingUp className="w-4 h-4 text-accent" />
          <span className="font-subhead text-xs font-semibold text-accent tracking-wider">
            Sports Business Intelligence
          </span>
        </div>
        <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 text-headline leading-none">
          The Money Behind<br />
          <span className="text-accent">The Game</span>
        </h1>
        <p className="text-base md:text-lg text-subhead font-body leading-relaxed max-w-xl mx-auto">
          Ask anything about sports business—deals, valuations, media rights, 
          and market trends. Powered by verified industry data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-8">
        <div className="relative group">
          <div className="relative bg-surface-elevated border-2 border-border rounded-lg shadow-soft group-focus-within:border-accent group-focus-within:shadow-elevated transition-all duration-200">
            <div className="flex items-center px-5 py-4">
              <Search className="w-5 h-5 text-muted-foreground mr-4 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about sports business..."
                className="flex-1 bg-transparent outline-none text-lg font-body text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="ml-4 px-5 py-2.5 rounded bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-subhead text-xs font-bold tracking-wider flex items-center gap-2"
              >
                <span className="hidden sm:inline">Search</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="w-full max-w-2xl">
        <p className="font-subhead text-xs text-muted-foreground mb-4 text-center tracking-wider">
          Trending Topics
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {examplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handlePromptClick(prompt)}
              className="px-4 py-2.5 bg-surface-subtle hover:bg-secondary border border-border rounded text-sm font-body text-foreground/80 hover:text-foreground transition-all duration-200 hover:shadow-soft text-left hover:border-accent/50"
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
