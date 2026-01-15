import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";

interface SearchHeroProps {
  onSearch: (query: string) => void;
}

const examplePrompts = [
  "What are the latest NBA media rights developments?",
  "How is private equity reshaping European football ownership?",
  "Which sports franchises changed hands this quarter?",
  "What's driving the surge in women's sports valuations?",
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
    <div className="flex flex-col items-center justify-center min-h-[55vh] px-6 animate-fade-up">
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5 text-headline leading-tight">
          Intelligence for the
          <br />
          <span className="text-accent">Business of Sport</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground font-body leading-relaxed max-w-lg mx-auto">
          Ask questions about transactions, valuations, media rights, and market trends. 
          Get answers grounded in verified industry data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xl mb-8">
        <div className="relative group">
          <div className="relative bg-card border border-border rounded-sm shadow-soft group-focus-within:border-accent group-focus-within:shadow-elevated transition-all duration-200">
            <div className="flex items-center px-4 py-3">
              <Search className="w-5 h-5 text-muted-foreground mr-3 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-transparent outline-none text-base font-body text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="ml-3 px-4 py-2 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-subhead text-sm font-semibold flex items-center gap-2"
              >
                <span className="hidden sm:inline">Ask</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="w-full max-w-xl">
        <p className="font-subhead text-xs text-muted-foreground mb-3 text-center uppercase tracking-wider">
          Popular Questions
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {examplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handlePromptClick(prompt)}
              className="px-3 py-2 bg-card hover:bg-secondary border border-border rounded-sm text-sm font-body text-foreground/80 hover:text-foreground transition-all duration-200 hover:shadow-soft text-left hover:border-accent/30"
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
