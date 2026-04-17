import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tag as TagIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tag } from "@/lib/tag-utils";

interface TagChipsProps {
  articleId: string;
  className?: string;
}

/** Public-facing tag chips shown on an article. Loads tags via the article_tags join. */
export const TagChips = ({ articleId, className = "" }: TagChipsProps) => {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("article_tags")
        .select("tags(id, name, slug, description)")
        .eq("article_id", articleId);
      if (cancelled) return;
      const list = (data || [])
        .map((r: any) => r.tags)
        .filter(Boolean) as Tag[];
      list.sort((a, b) => a.name.localeCompare(b.name, "nb"));
      setTags(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <TagIcon className="w-4 h-4 text-muted-foreground" aria-hidden />
      {tags.map((tag) => (
        <Link
          key={tag.id}
          to={`/tag/${tag.slug}`}
          className="inline-flex items-center px-3 py-1 rounded-full bg-muted hover:bg-accent/15 text-sm font-body text-foreground/80 hover:text-foreground transition-colors border border-border"
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
};
