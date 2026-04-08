import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import { List, Trash2, X, Building2 } from "lucide-react";
import { CompanyDetail } from "./CompanyDetail";

export function CompanyLists({ session }: { session: any }) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [selectedOrgnr, setSelectedOrgnr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    setItems(data || []);
  };

  const deleteList = async (listId: string) => {
    await supabase.from("company_lists").delete().eq("id", listId);
    setLists(lists.filter((l) => l.id !== listId));
    if (selectedList?.id === listId) {
      setSelectedList(null);
      setItems([]);
    }
    toast({ title: isNo ? "Liste slettet" : "List deleted" });
  };

  const removeItem = async (itemId: string) => {
    await supabase.from("company_list_items").delete().eq("id", itemId);
    setItems(items.filter((i) => i.id !== itemId));
    toast({ title: isNo ? "Fjernet fra listen" : "Removed from list" });
  };

  if (!session) {
    return (
      <div className="text-center py-16">
        <List className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground font-body">
          {isNo ? "Logg inn for å opprette og administrere lister" : "Sign in to create and manage lists"}
        </p>
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
          <p className="text-muted-foreground font-body text-sm py-8 text-center">
            {isNo ? "Ingen selskaper i denne listen ennå" : "No companies in this list yet"}
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-3 group">
                <button onClick={() => setSelectedOrgnr(item.orgnr)} className="flex items-center gap-3 text-left min-w-0">
                  <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-subhead font-medium text-sm text-headline group-hover:text-accent transition-colors truncate">{item.company_name}</p>
                    <p className="text-xs text-muted-foreground font-body">{item.orgnr}</p>
                  </div>
                </button>
                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
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
          <p className="text-muted-foreground font-body mb-2">
            {isNo ? "Du har ingen lister ennå" : "You have no lists yet"}
          </p>
          <p className="text-sm text-muted-foreground font-body">
            {isNo ? "Søk etter et selskap og legg det til i en ny liste" : "Search for a company and add it to a new list"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lists.map((list) => (
            <div key={list.id} className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-all group">
              <div className="flex items-start justify-between">
                <button
                  onClick={() => { setSelectedList(list); loadItems(list.id); }}
                  className="text-left flex-1 min-w-0"
                >
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
