import { useState } from "react";
import { Header } from "@/components/Header";
import { SearchHero } from "@/components/SearchHero";
import { ConversationView } from "@/components/ConversationView";
import { RelatedArticles } from "@/components/RelatedArticles";
import { NewsFeed } from "@/components/NewsFeed";
import { ViewToggle } from "@/components/ViewToggle";

const Index = () => {
  const [view, setView] = useState<"search" | "feed">("search");
  const [conversationQuery, setConversationQuery] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setConversationQuery(query);
  };

  const handleBackToSearch = () => {
    setConversationQuery(null);
  };

  // If in conversation mode, show the conversation view
  if (conversationQuery) {
    return (
      <div className="min-h-screen bg-background">
        <ConversationView
          initialQuery={conversationQuery}
          onBack={handleBackToSearch}
        />
        <RelatedArticles />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      
      <main>
        <ViewToggle view={view} onViewChange={setView} />
        
        {view === "search" ? (
          <SearchHero onSearch={handleSearch} />
        ) : (
          <NewsFeed />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="font-editorial text-lg font-medium text-headline mb-1">
                The Dispatch
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                Journalism reimagined for the conversational age.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm font-body text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Careers</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
