import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";

interface SearchHeroProps {
  onSearch: (query: string) => void;
}

const examplePrompts = [
  "What's happening with the climate summit negotiations?",
  "Explain the latest developments in AI regulation",
  "How is the housing market changing in major cities?",
  "What do economists predict for inflation this year?",
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
      <div className="text-center mb-12 max-w-2xl">
        <h1 className="font-editorial text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight mb-6 text-headline">
          The Dispatch
        </h1>
        <p className="text-lg md:text-xl text-subhead font-body leading-relaxed">
          Ask anything. Get answers grounded in trusted journalism, 
          original reporting, and verified sources.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-10">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-surface-elevated border border-border rounded-2xl shadow-soft group-focus-within:shadow-elevated transition-all duration-300">
            <div className="flex items-center px-6 py-4">
              <Search className="w-5 h-5 text-muted-foreground mr-4 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about the news..."
                className="flex-1 bg-transparent outline-none text-lg font-body text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="ml-4 p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="w-full max-w-2xl">
        <p className="text-sm text-muted-foreground mb-4 text-center font-body">
          Try asking about
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {examplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handlePromptClick(prompt)}
              className="px-4 py-2.5 bg-surface-subtle hover:bg-secondary border border-border rounded-xl text-sm font-body text-foreground/80 hover:text-foreground transition-all duration-200 hover:shadow-soft text-left"
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
