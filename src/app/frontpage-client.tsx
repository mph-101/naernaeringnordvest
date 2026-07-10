"use client";

import { lazy, Suspense, useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { SearchHero } from "@/components/SearchHero";
import { RelatedArticles } from "@/components/RelatedArticles";

// Only mounts after the user submits a question — keep the whole conversation
// stack (react-markdown etc.) out of the critical front-page chunk.
const ConversationView = lazy(() =>
  import("@/components/ConversationView").then((m) => ({ default: m.ConversationView })),
);
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
import { FirstVisitBanner } from "@/components/onboarding/FirstVisitBanner";

export function FrontpageClient() {
  const { language, defaultView, hiddenElements } = useTheme();
  const t = translations[language];
  const audioModeEnabled = useAudioModeEnabled();

  // Read query params directly from browser URL (react-router's useSearchParams
  // doesn't sync with Next.js routing)
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlView = urlParams?.get("view");

  const getInitialView = (): "search" | "feed" => {
    if (urlView === "feed" || urlView === "search") return urlView;
    // Avisa først: feeden er standard; Spør kun ved eksplisitt valg.
    return defaultView === "search" ? "search" : "feed";
  };

  const [view, setView] = useState<"search" | "feed">(getInitialView);
  const [conversationQuery, setConversationQuery] = useState<string | null>(null);
  const [conversationSources, setConversationSources] = useState<ArticleSource[]>([]);

  useEffect(() => {
    if (defaultView === "tall" && !urlView) {
      window.location.replace("/tall");
    }
  }, []);

  // Førstegangsbesøkende sendes ikke lenger til /velkommen — avisa vises
  // umiddelbart, og region-/startside-valget tilbys via FirstVisitBanner.
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
        <Suspense fallback={<div className="min-h-screen" />}>
          <ConversationView
            initialQuery={conversationQuery}
            onBack={handleBackToSearch}
            onSourcesChange={setConversationSources}
          />
        </Suspense>
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

        <FirstVisitBanner />

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
