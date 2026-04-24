import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, Loader2, UserCircle2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AuthorOption {
  id: string;
  name: string;
  title: string | null;
  avatar_url: string | null;
}

interface AuthorSelectProps {
  /** Stores the author's display NAME (matches articles.author column). */
  value: string;
  onChange: (name: string) => void;
}

export const AuthorSelect = ({ value, onChange }: AuthorSelectProps) => {
  const [open, setOpen] = useState(false);
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("authors")
        .select("id, name, title, avatar_url")
        .eq("active", true)
        .order("name", { ascending: true });
      if (!active) return;
      setAuthors((data ?? []) as AuthorOption[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const selected = authors.find((a) => a.name === value);
  const filtered = filter
    ? authors.filter((a) => a.name.toLowerCase().includes(filter.toLowerCase()))
    : authors;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-1.5 w-full h-10 px-3 rounded-md border border-input bg-background flex items-center gap-2 text-left hover:border-primary/40 transition-colors"
        >
          {selected?.avatar_url ? (
            <img
              src={selected.avatar_url}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <UserCircle2 className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="flex-1 text-sm truncate">
            {value || (
              <span className="text-muted-foreground">Velg forfatter…</span>
            )}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <div className="p-2 border-b border-border">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Søk forfatter…"
            className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {authors.length === 0
                ? "Ingen forfattere opprettet ennå."
                : "Ingen treff."}
            </div>
          ) : (
            filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  onChange(a.name);
                  setOpen(false);
                  setFilter("");
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors ${
                  a.name === value ? "bg-primary/5" : ""
                }`}
              >
                {a.avatar_url ? (
                  <img
                    src={a.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <UserCircle2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {a.name}
                  </div>
                  {a.title && (
                    <div className="text-xs text-muted-foreground truncate">
                      {a.title}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};