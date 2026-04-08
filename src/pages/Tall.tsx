import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { ViewToggle } from "@/components/ViewToggle";
import { CompanySearch } from "@/components/tall/CompanySearch";
import { CompanyTable } from "@/components/tall/CompanyTable";
import { CompanyLists } from "@/components/tall/CompanyLists";
import { EstablishmentsOverview } from "@/components/tall/EstablishmentsOverview";
import { CompanyQuery } from "@/components/tall/CompanyQuery";
import { useTheme } from "@/hooks/useTheme";
import { Search, List, TrendingUp, MessageSquare } from "lucide-react";

type Tab = "search" | "lists" | "overview" | "query";

export default function Tall() {
  const { language } = useTheme();
  const isNo = language === "no";
  const [tab, setTab] = useState<Tab>("search");
  const [session, setSession] = useState<any>(null);
  const [selectedFylker, setSelectedFylker] = useState<string[]>([]);
  const [selectedKommuner, setSelectedKommuner] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "search", label: isNo ? "Selskapssøk" : "Company Search", icon: Search },
    { id: "query", label: isNo ? "Spør databasen" : "Ask Database", icon: MessageSquare },
    { id: "lists", label: isNo ? "Mine lister" : "My Lists", icon: List },
    { id: "overview", label: isNo ? "Nyetableringer" : "New Businesses", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <ViewToggle view="feed" onViewChange={() => {}} />

      <div className="bg-gradient-warm py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="font-subhead text-sm text-accent-foreground/70 mb-2 uppercase tracking-wider">
            {isNo ? "Møre og Romsdal" : "Møre og Romsdal"}
          </p>
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-accent-foreground mb-3">
            {isNo ? "Bedriftsdatabasen" : "Company Database"}
          </h1>
          <p className="font-body text-accent-foreground/80 text-lg max-w-2xl">
            {isNo
              ? "Søk blant alle AS og ASA i regionen. Se nøkkeltall, roller og lag egne lister."
              : "Search all AS and ASA companies in the region. View key figures, roles and create custom lists."}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-subhead whitespace-nowrap transition-all ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-card border border-border text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "search" && (
          <div className="space-y-10">
           <CompanySearch
              session={session}
              selectedFylker={selectedFylker}
              selectedKommuner={selectedKommuner}
              onFylkerChange={setSelectedFylker}
              onKommunerChange={setSelectedKommuner}
            />
            <CompanyTable
              session={session}
              selectedFylker={selectedFylker}
              selectedKommuner={selectedKommuner}
              onFylkerChange={setSelectedFylker}
              onKommunerChange={setSelectedKommuner}
            />
          </div>
        )}
        {tab === "query" && <CompanyQuery />}
        {tab === "lists" && <CompanyLists session={session} />}
        {tab === "overview" && (
          <EstablishmentsOverview
            selectedFylker={selectedFylker}
            selectedKommuner={selectedKommuner}
            onFylkerChange={setSelectedFylker}
            onKommunerChange={setSelectedKommuner}
          />
        )}
      </div>
    </div>
  );
}
