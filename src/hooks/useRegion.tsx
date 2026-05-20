import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Region {
  slug: string;
  name: string;
}

interface RegionContextValue {
  current: Region | null;
  all: Region[];
  loading: boolean;
  switchRegion: (slug: string) => void;
}

const RegionContext = createContext<RegionContextValue>({
  current: null,
  all: [],
  loading: true,
  switchRegion: () => {},
});

export function RegionProvider({ children }: { children: ReactNode }) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [current, setCurrent] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("editorial_regions")
        .select("slug, name")
        .order("sort_order", { ascending: true });

      const active: Region[] = (data ?? []) as Region[];
      setRegions(active);

      const fallback = active.find((r) => r.slug !== "nasjonal") ?? active[0] ?? null;
      setCurrent(fallback);
      setLoading(false);
    })();
  }, []);

  function switchRegion(slug: string) {
    const target = regions.find((r) => r.slug === slug);
    if (target) setCurrent(target);
  }

  return (
    <RegionContext.Provider value={{ current, all: regions, loading, switchRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
