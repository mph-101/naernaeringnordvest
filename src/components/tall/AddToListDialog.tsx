import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface Props {
  orgnr: string;
  companyName: string;
  session: any;
  onClose: () => void;
}

export function AddToListDialog({ orgnr, companyName, session, onClose }: Props) {
  const { language } = useTheme();
  const isNo = language === "no";
  const [lists, setLists] = useState<any[]>([]);
  const [newListName, setNewListName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    const { data } = await supabase.from("company_lists").select("*").order("created_at", { ascending: false });
    setLists(data || []);
  };

  const createAndAdd = async () => {
    if (!newListName.trim()) return;
    setLoading(true);
    const { data: list, error } = await supabase
      .from("company_lists")
      .insert({ user_id: session.user.id, name: newListName.trim() })
      .select()
      .single();
    if (error || !list) {
      toast({ title: isNo ? "Feil" : "Error", variant: "destructive" });
      setLoading(false);
      return;
    }
    await addToList(list.id);
    setLoading(false);
  };

  const addToList = async (listId: string) => {
    const { error } = await supabase
      .from("company_list_items")
      .insert({ list_id: listId, orgnr, company_name: companyName });
    if (error) {
      if (error.code === "23505") {
        toast({ title: isNo ? "Allerede i listen" : "Already in list" });
      } else {
        toast({ title: isNo ? "Feil" : "Error", variant: "destructive" });
      }
    } else {
      toast({ title: isNo ? "Lagt til i listen" : "Added to list" });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline text-lg font-semibold">{isNo ? "Legg til i liste" : "Add to list"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-sm text-muted-foreground font-body mb-4">{companyName}</p>

        {lists.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-muted-foreground font-subhead">{isNo ? "Eksisterende lister" : "Existing lists"}</p>
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => addToList(l.id)}
                className="w-full text-left px-3 py-2 rounded-lg border border-border hover:border-accent/40 hover:bg-secondary transition-all text-sm font-subhead"
              >
                {l.name}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground font-subhead mb-2">{isNo ? "Opprett ny liste" : "Create new list"}</p>
          <div className="flex gap-2">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={isNo ? "Listenavn..." : "List name..."}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background font-body text-sm focus:outline-none focus:border-accent"
              onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
            />
            <button
              onClick={createAndAdd}
              disabled={loading || !newListName.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-subhead hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isNo ? "Opprett" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
