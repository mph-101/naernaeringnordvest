import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

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

export const ArticlesList = ({ onEdit }: ArticlesListProps) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
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
        <Button onClick={() => onEdit(null)}>
          <Plus className="w-4 h-4 mr-2" />
          Ny artikkel
        </Button>
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
                    Tittel
                  </th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body hidden md:table-cell">
                    Kategori
                  </th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body hidden lg:table-cell">
                    Forfatter
                  </th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground font-body hidden md:table-cell">
                    Opprettet
                  </th>
                  <th className="text-right px-6 py-4 font-medium text-muted-foreground font-body">
                    Handlinger
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {articles.map((article) => (
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
