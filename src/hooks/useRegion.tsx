import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Region {
  slug: string;
  name: string;
  subdomain: string | null;
  is_active: boolean;
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

function detectRegionFromHost(): string | null {
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [current, setCurrent] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Try new schema first (with is_active column), fall back to old schema
      let active: Region[] = [];
      const { data, error } = await supabase
        .from("editorial_regions")
        .select("slug, name, subdomain, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        active = data as Region[];
      } else {
        // Pre-migration fallback: fetch all regions without new columns
        const { data: fallbackData } = await supabase
          .from("editorial_regions")
          .select("slug, name")
          .order("sort_order", { ascending: true });
        active = (fallbackData ?? []).map((r: any) => ({
          ...r,
          subdomain: null,
          is_active: true,
        }));
      }

      setRegions(active);

      const sub = detectRegionFromHost();
      const match = active.find((r) => r.subdomain === sub);

      if (match) {
        setCurrent(match);
      } else {
        const fallback = active.find((r) => r.slug !== "nasjonal") ?? active[0] ?? null;
        setCurrent(fallback);
      }

      setLoading(false);
    })();
  }, []);

  function switchRegion(slug: string) {
    const target = regions.find((r) => r.slug === slug);
    if (!target) return;

    if (target.subdomain) {
      const { protocol, port, pathname } = window.location;
      const domain = window.location.hostname.split(".").slice(-2).join(".");
      const newHost = `${target.subdomain}.${domain}${port ? `:${port}` : ""}`;
      window.location.href = `${protocol}//${newHost}${pathname}`;
    } else {
      setCurrent(target);
    }
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
