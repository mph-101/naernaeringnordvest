import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Article {
  id: string;
  title: string;
  category: string;
  author: string;
  published: boolean;
  created_at: string;
  type: string;
  status: string;
}

interface ArticlesListProps {
  onEdit: (id: string | null) => void;
}

type SortKey = "title" | "category" | "author" | "status" | "created_at";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "draft" | "review" | "published";

const STATUS_RANK: Record<string, number> = { draft: 0, review: 1, published: 2 };

export const ArticlesList = ({ onEdit }: ArticlesListProps) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, category, author, published, created_at, type, status")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      toast({
        title: "Feil",
        description: "Kunne ikke hente artikler",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne artikkelen?")) return;

    try {
      const { error } = await supabase
        .from("articles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Slettet",
        description: "Artikkelen er slettet",
      });
      fetchArticles();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("articles")
        .update({ 
          published: !currentStatus,
          published_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: currentStatus ? "Avpublisert" : "Publisert",
        description: currentStatus ? "Artikkelen er nå avpublisert" : "Artikkelen er nå publisert",
      });
      fetchArticles();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ active }: { active: boolean }) => {
    if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const visibleArticles = useMemo(() => {
    const filtered = statusFilter === "all"
      ? articles
      : articles.filter((a) => a.status === statusFilter);

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":
          cmp = a.title.localeCompare(b.title, "nb");
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "", "nb");
          break;
        case "author":
          cmp = (a.author || "").localeCompare(b.author || "", "nb");
          break;
        case "status":
          cmp = (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
          break;
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [articles, sortKey, sortDir, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-headline text-2xl font-semibold text-headline">
          Artikler
        </h2>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle ({articles.length})</SelectItem>
              <SelectItem value="draft">Kladd ({articles.filter((a) => a.status === "draft").length})</SelectItem>
              <SelectItem value="review">Gjennomlesning ({articles.filter((a) => a.status === "review").length})</SelectItem>
              <SelectItem value="published">Publisert ({articles.filter((a) => a.status === "published").length})</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => onEdit(null)}>
            <Plus className="w-4 h-4 mr-2" />
            Ny artikkel
          </Button>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="bg-card rounded-xl p-12 text-center shadow-soft">
          <p className="text-muted-foreground font-body mb-4">
            Ingen artikler ennå
          </p>
          <Button onClick={() => onEdit(null)}>
            <Plus className="w-4 h-4 mr-2" />
            Opprett din første artikkel
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body">
                    <button type="button" onClick={() => toggleSort("title")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                      Tittel <SortIcon active={sortKey === "title"} />
                    </button>
                  </th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body hidden md:table-cell">
                    <button type="button" onClick={() => toggleSort("category")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                      Kategori <SortIcon active={sortKey === "category"} />
                    </button>
                  </th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body hidden lg:table-cell">
                    <button type="button" onClick={() => toggleSort("author")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                      Forfatter <SortIcon active={sortKey === "author"} />
                    </button>
                  </th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body">
                    <button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                      Status <SortIcon active={sortKey === "status"} />
                    </button>
                  </th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body hidden md:table-cell">
                    <button type="button" onClick={() => toggleSort("created_at")} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                      Opprettet <SortIcon active={sortKey === "created_at"} />
                    </button>
                  </th>
                  <th className="text-right px-6 py-4 font-medium text-muted-foreground font-body">
                    Handlinger
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleArticles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      Ingen artikler matcher filteret.
                    </td>
                  </tr>
                )}
                {visibleArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-headline font-body line-clamp-1">
                        {article.title}
                      </div>
                      <div className="text-sm text-muted-foreground md:hidden">
                        {article.category}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-body hidden md:table-cell">
                      {article.category}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-body hidden lg:table-cell">
                      {article.author}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                        ${article.status === "published" 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                          : article.status === "review"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }
                      `}>
                        {article.status === "published" ? (
                          <><Eye className="w-3 h-3" /> Publisert</>
                        ) : article.status === "review" ? (
                          <><Eye className="w-3 h-3" /> Gjennomlesning</>
                        ) : (
                          <><EyeOff className="w-3 h-3" /> Kladd</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-body text-sm hidden md:table-cell">
                      {format(new Date(article.created_at), "d. MMM yyyy", { locale: nb })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTogglePublish(article.id, article.published)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title={article.published ? "Avpubliser" : "Publiser"}
                        >
                          {article.published ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => onEdit(article.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="Rediger"
                        >
                          <Edit className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Slett"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
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
};
