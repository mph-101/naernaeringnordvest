import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import { List, Trash2, X, Building2, Users, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { CompanyDetail } from "./CompanyDetail";

interface ListItem {
  id: string;
  orgnr: string;
  company_name: string;
  added_at: string;
  list_id: string;
}

interface ListItemWithFinancials extends ListItem {
  antallAnsatte?: number;
  omsetning?: number;
  arsresultat?: number;
  loadingFinancials?: boolean;
}

export function CompanyLists({ session }: { session: any }) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [items, setItems] = useState<ListItemWithFinancials[]>([]);
  const [selectedOrgnr, setSelectedOrgnr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brreg-proxy`;
  const headers = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

  useEffect(() => {
    if (session) loadLists();
    else setLoading(false);
  }, [session]);

  const loadLists = async () => {
    const { data } = await supabase.from("company_lists").select("*").order("created_at", { ascending: false });
    setLists(data || []);
    setLoading(false);
  };

  const loadItems = async (listId: string) => {
    const { data } = await supabase.from("company_list_items").select("*").eq("list_id", listId).order("added_at", { ascending: false });
    const baseItems: ListItemWithFinancials[] = (data || []).map((d) => ({ ...d, loadingFinancials: true }));
    setItems(baseItems);

    // Fetch key figures for each company
    for (const item of baseItems) {
      try {
        const [searchRes, finRes] = await Promise.all([
          fetch(`${baseUrl}?action=search&q=${encodeURIComponent(item.orgnr)}&size=1`, { headers }).then((r) => r.json()),
          fetch(`${baseUrl}?action=financials&orgnr=${item.orgnr}`, { headers }).then((r) => r.json()).catch(() => ({ financials: [] })),
        ]);
        const company = searchRes.companies?.[0];
        const latestYear = (finRes.financials || []).sort((a: any, b: any) => (b.year || "").localeCompare(a.year || ""))[0];
        setItems((prev) =>
          prev.map((i) =>
            i.orgnr === item.orgnr
              ? {
                  ...i,
                  antallAnsatte: company?.antallAnsatte || 0,
                  omsetning: latestYear?.omsetning || 0,
                  arsresultat: latestYear?.arsresultat || 0,
                  loadingFinancials: false,
                }
              : i
          )
        );
      } catch {
        setItems((prev) => prev.map((i) => (i.orgnr === item.orgnr ? { ...i, loadingFinancials: false } : i)));
      }
    }
  };

  const deleteList = async (listId: string) => {
    await supabase.from("company_lists").delete().eq("id", listId);
    setLists(lists.filter((l) => l.id !== listId));
    if (selectedList?.id === listId) { setSelectedList(null); setItems([]); }
    toast({ title: isNo ? "Liste slettet" : "List deleted" });
  };

  const removeItem = async (itemId: string) => {
    await supabase.from("company_list_items").delete().eq("id", itemId);
    setItems(items.filter((i) => i.id !== itemId));
    toast({ title: isNo ? "Fjernet fra listen" : "Removed from list" });
  };

  const formatNOK = (val?: number) => {
    if (!val) return "—";
    if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(1)} mrd`;
    if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(1)} mill`;
    if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(0)}k`;
    return val.toLocaleString();
  };

  if (!session) {
    return (
      <div className="text-center py-16">
        <List className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground font-body">{isNo ? "Logg inn for å opprette og administrere lister" : "Sign in to create and manage lists"}</p>
      </div>
    );
  }

  if (selectedOrgnr) {
    return (
      <div>
        <button onClick={() => setSelectedOrgnr(null)} className="text-sm text-muted-foreground hover:text-foreground mb-4 font-body transition-colors">
          ← {isNo ? "Tilbake til listen" : "Back to list"}
        </button>
        <CompanyDetail orgnr={selectedOrgnr} session={session} />
      </div>
    );
  }

  if (selectedList) {
    return (
      <div>
        <button onClick={() => { setSelectedList(null); setItems([]); }} className="text-sm text-muted-foreground hover:text-foreground mb-4 font-body transition-colors">
          ← {isNo ? "Alle lister" : "All lists"}
        </button>
        <h3 className="font-headline text-xl font-bold text-headline mb-4">{selectedList.name}</h3>
        {items.length === 0 ? (
          <p className="text-muted-foreground font-body text-sm py-8 text-center">{isNo ? "Ingen selskaper i denne listen ennå" : "No companies in this list yet"}</p>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left py-3 px-4 font-subhead text-muted-foreground font-medium">{isNo ? "Selskap" : "Company"}</th>
                    <th className="text-right py-3 px-4 font-subhead text-muted-foreground font-medium">
                      <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{isNo ? "Ansatte" : "Employees"}</span>
                    </th>
                    <th className="text-right py-3 px-4 font-subhead text-muted-foreground font-medium">
                      <span className="inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" />{isNo ? "Omsetning" : "Revenue"}</span>
                    </th>
                    <th className="text-right py-3 px-4 font-subhead text-muted-foreground font-medium">
                      <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />{isNo ? "Resultat" : "Profit"}</span>
                    </th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors group" onClick={() => setSelectedOrgnr(item.orgnr)}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-warm flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-accent-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-subhead font-medium text-headline group-hover:text-accent transition-colors truncate text-sm">{item.company_name}</p>
                            <p className="text-xs text-muted-foreground font-body">{item.orgnr}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-subhead text-sm">
                        {item.loadingFinancials ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground inline" /> : (item.antallAnsatte?.toLocaleString() || "—")}
                      </td>
                      <td className="py-3 px-4 text-right font-subhead text-sm">
                        {item.loadingFinancials ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground inline" /> : formatNOK(item.omsetning)}
                      </td>
                      <td className={`py-3 px-4 text-right font-subhead text-sm ${(item.arsresultat || 0) < 0 ? "text-destructive" : ""}`}>
                        {item.loadingFinancials ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground inline" /> : formatNOK(item.arsresultat)}
                      </td>
                      <td className="py-3 px-2">
                        <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {loading ? (
        <p className="text-center text-muted-foreground font-body py-8">{isNo ? "Laster..." : "Loading..."}</p>
      ) : lists.length === 0 ? (
        <div className="text-center py-16">
          <List className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-body mb-2">{isNo ? "Du har ingen lister ennå" : "You have no lists yet"}</p>
          <p className="text-sm text-muted-foreground font-body">{isNo ? "Søk etter et selskap og legg det til i en ny liste" : "Search for a company and add it to a new list"}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lists.map((list) => (
            <div key={list.id} className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-all group">
              <div className="flex items-start justify-between">
                <button onClick={() => { setSelectedList(list); loadItems(list.id); }} className="text-left flex-1 min-w-0">
                  <p className="font-headline font-semibold text-headline group-hover:text-accent transition-colors">{list.name}</p>
                  {list.description && <p className="text-xs text-muted-foreground font-body mt-1">{list.description}</p>}
                </button>
                <button onClick={() => deleteList(list.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
