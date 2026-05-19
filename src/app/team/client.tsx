"use client";

import { Header } from "@/components/Header";
import { TeamSection } from "@/components/TeamSection";
import { SiteFooter } from "@/components/SiteFooter";

export function TeamPageClient() {
  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="pt-8">
        <TeamSection />
      </main>
      <SiteFooter />
    </div>
  );
}
