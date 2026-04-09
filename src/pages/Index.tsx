import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchHero } from "@/components/SearchHero";
import { ConversationView } from "@/components/ConversationView";
import { RelatedArticles } from "@/components/RelatedArticles";
import { NewsFeed } from "@/components/NewsFeed";
import { ViewToggle } from "@/components/ViewToggle";
import { JobChangeFeed } from "@/components/JobChangeFeed";

import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";

const Index = () => {
  const { language, defaultView, hasOnboarded } = useTheme();
  const t = translations[language];
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const getInitialView = (): "search" | "feed" => {
    const urlView = searchParams.get("view");
    if (urlView === "feed" || urlView === "search") return urlView;
    if (defaultView === "feed") return "feed";
    return "search";
  };

  const [view, setView] = useState<"search" | "feed">(getInitialView);
  const [conversationQuery, setConversationQuery] = useState<string | null>(null);

  useEffect(() => {
    const v = searchParams.get("view");
    if (v === "feed" || v === "search") setView(v);
  }, [searchParams]);

  // Redirect to /idrett if default view is "tall" and no explicit view param
  useEffect(() => {
    if (defaultView === "tall" && !searchParams.get("view")) {
      navigate("/idrett", { replace: true });
    }
  }, []);

  // Redirect to onboarding if user hasn't chosen a start page yet
  if (!hasOnboarded && !searchParams.get("view")) {
    return <Navigate to="/velkommen" replace />;
  }

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
        
        {view === "search" ? <SearchHero onSearch={handleSearch} /> : (
          <>
            <NewsFeed />
            {!hiddenElements.includes("job_changes") && (
              <div className="max-w-4xl mx-auto px-6 mt-8">
                <JobChangeFeed />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="font-headline text-lg font-medium text-headline mb-1">
                {t.brandName}
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                {t.footerTagline}
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm font-body text-muted-foreground">
              <a href="/team" className="hover:text-foreground transition-colors">{t.footerAbout}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerContact}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerPrivacy}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t.footerTerms}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
