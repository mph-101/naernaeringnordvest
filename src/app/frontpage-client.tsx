"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchHero } from "@/components/SearchHero";
import { ConversationView } from "@/components/ConversationView";
import { RelatedArticles } from "@/components/RelatedArticles";
import { NewsFeed } from "@/components/NewsFeed";
import { ViewToggle } from "@/components/ViewToggle";
import { JobChangeFeed } from "@/components/JobChangeFeed";
import { EventsFeed } from "@/components/EventsFeed";
import { TrendingSection } from "@/components/TrendingSection";
import { MarketTicker } from "@/components/MarketTicker";
import { FrontpagePoll } from "@/components/FrontpagePoll";
import { SiteFooter } from "@/components/SiteFooter";
import type { ArticleSource } from "@/lib/articles-chat";
import { DailyEditionCTA } from "@/components/audio/DailyEditionCTA";
import { useAudioModeEnabled } from "@/hooks/useAudioModeEnabled";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";

export function FrontpageClient() {
  const { language, defaultView, hasOnboarded, hiddenElements } = useTheme();
  const t = translations[language];
  const audioModeEnabled = useAudioModeEnabled();
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
  const [conversationSources, setConversationSources] = useState<ArticleSource[]>([]);

  useEffect(() => {
    const v = searchParams.get("view");
    if (v === "feed" || v === "search") setView(v);
  }, [searchParams]);

  useEffect(() => {
    if (defaultView === "tall" && !searchParams.get("view")) {
      window.location.replace("/idrett");
    }
  }, []);

  if (!hasOnboarded && !searchParams.get("view")) {
    if (typeof window !== "undefined") window.location.replace("/velkommen");
    return null;
  }

  const handleSearch = (query: string) => {
    setConversationQuery(query);
    setConversationSources([]);
  };

  const handleBackToSearch = () => {
    setConversationQuery(null);
    setConversationSources([]);
  };

  if (conversationQuery) {
    return (
      <div className="min-h-screen bg-background">
        <ConversationView
          initialQuery={conversationQuery}
          onBack={handleBackToSearch}
          onSourcesChange={setConversationSources}
        />
        <RelatedArticles sources={conversationSources} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main>
        <div data-tour="view-toggle">
          <ViewToggle view={view} onViewChange={setView} />
        </div>

        {view === "search" ? <SearchHero onSearch={handleSearch} /> : (
          <>
            <MarketTicker />
            <TrendingSection />
            {audioModeEnabled && <DailyEditionCTA />}
            <div data-tour="news-feed">
              <NewsFeed />
            </div>
            <FrontpagePoll />
            {!hiddenElements.includes("job_changes") && (
              <div data-tour="job-changes" className="max-w-5xl mx-auto px-6 pb-16">
                <JobChangeFeed />
              </div>
            )}
            <div className="max-w-5xl mx-auto px-6 pb-16">
              <EventsFeed />
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
