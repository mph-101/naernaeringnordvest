import { useEffect, useMemo, useRef, useState } from "react";
import { Tag as TagIcon, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { slugifyTag, type Tag } from "@/lib/tag-utils";

interface ArticleTagInputProps {
  /** Currently selected tags on the article */
  value: Tag[];
  onChange: (tags: Tag[]) => void;
}

/**
 * Autocomplete input for tagging an article. Shows matching existing tags
 * from the `tags` table and lets the user create new ones inline.
 *
 * The new tag is created in the database immediately on selection so we
 * always have a stable `id` to persist in `article_tags`.
 */
export const ArticleTagInput = ({ value, onChange }: ArticleTagInputProps) => {
  const { toast } = useToast();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadTags();
  }, []);

  const loadTags = async () => {
    const { data, error } = await supabase
      .from("tags")
      .select("id, name, slug, description")
      .order("name");
    if (error) return;
    setAllTags((data || []) as Tag[]);
  };

  const selectedIds = useMemo(() => new Set(value.map((t) => t.id)), [value]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTags.filter((t) => !selectedIds.has(t.id)).slice(0, 8);
    return allTags
      .filter((t) => !selectedIds.has(t.id) && t.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, allTags, selectedIds]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return allTags.find((t) => t.name.toLowerCase() === q) || null;
  }, [query, allTags]);

  const handleAdd = (tag: Tag) => {
    if (selectedIds.has(tag.id)) return;
    onChange([...value, tag]);
    setQuery("");
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((t) => t.id !== id));
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name) return;
    if (exactMatch) {
      handleAdd(exactMatch);
      return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("tags")
        .insert({ name, slug: slugifyTag(name), created_by: user?.id })
        .select("id, name, slug, description")
        .single();
      if (error) throw error;
      const newTag = data as Tag;
      setAllTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name, "nb")));
      handleAdd(newTag);
    } catch (err: any) {
      toast({ title: "Kunne ikke opprette tag", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (matches.length > 0) handleAdd(matches[0]);
      else if (query.trim()) void handleCreate();
    } else if (e.key === "Backspace" && !query && value.length > 0) {
      handleRemove(value[value.length - 1].id);
    }
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="flex items-center gap-1.5 py-1 px-3">
              <TagIcon className="w-3 h-3" />
              <span className="font-subhead text-xs">{tag.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(tag.id)}
                className="ml-1 hover:text-destructive"
                aria-label={`Fjern ${tag.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Label htmlFor="tag_search">Legg til tag</Label>
        <Input
          ref={inputRef}
          id="tag_search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Skriv tag-navn og trykk Enter…"
          className="mt-1.5"
          autoComplete="off"
        />
        {creating && <Loader2 className="absolute right-3 top-9 w-4 h-4 animate-spin text-muted-foreground" />}

        {showResults && (matches.length > 0 || (query.trim() && !exactMatch)) && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {matches.map((t) => (
              <button
                key={t.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAdd(t)}
                className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2"
              >
                <TagIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-subhead text-sm">{t.name}</span>
              </button>
            ))}
            {query.trim() && !exactMatch && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreate}
                disabled={creating}
                className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-t border-border text-sm flex items-center gap-2 text-primary"
              >
                <span>+ Opprett ny tag</span>
                <span className="font-subhead font-medium">«{query.trim()}»</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
