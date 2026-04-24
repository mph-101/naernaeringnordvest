import { useEffect, useState } from "react";
import { User, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AuthorProfile {
  name: string;
  title: string | null;
  avatar_url: string | null;
}

interface ArticleBylineProps {
  authorName: string;
  publishedAt: string;
  readTime: string;
}

/**
 * Displays an article byline. If the author name matches a saved author
 * profile, the byline shows the avatar and title. Otherwise it falls back
 * to a simple icon + name layout.
 */
export const ArticleByline = ({ authorName, publishedAt, readTime }: ArticleBylineProps) => {
  const [profile, setProfile] = useState<AuthorProfile | null>(null);

  useEffect(() => {
    if (!authorName) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("authors")
        .select("name, title, avatar_url")
        .eq("name", authorName)
        .eq("active", true)
        .maybeSingle();
      if (!active) return;
      setProfile(data ?? null);
    })();
    return () => {
      active = false;
    };
  }, [authorName]);

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground font-body mb-10">
      <span className="flex items-center gap-2.5">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-accent/10"
          />
        ) : (
          <span className="w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-accent" />
          </span>
        )}
        <span className="flex flex-col leading-tight">
          <span className="font-subhead font-semibold text-foreground">{authorName}</span>
          {profile?.title && (
            <span className="text-xs text-muted-foreground">{profile.title}</span>
          )}
        </span>
      </span>
      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
      <span className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" />
        {publishedAt}
      </span>
      {readTime && (
        <>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {readTime}
          </span>
        </>
      )}
    </div>
  );
};