import { supabase } from "@/integrations/supabase/client";

export interface EditorialRegion {
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  subdomain: string | null;
  is_active: boolean;
}

let cache: EditorialRegion[] | null = null;
let inflight: Promise<EditorialRegion[]> | null = null;

export async function fetchRegions(): Promise<EditorialRegion[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("editorial_regions" as any)
      .select("slug, name, description, sort_order, subdomain, is_active")
      .order("sort_order", { ascending: true });
    if (error) {
      inflight = null;
      throw error;
    }
    cache = ((data || []) as unknown) as EditorialRegion[];
    inflight = null;
    return cache;
  })();
  return inflight;
}

export function clearRegionCache() {
  cache = null;
}

export function regionLabel(regions: EditorialRegion[], slug: string | null | undefined): string {
  if (!slug) return "";
  const r = regions.find((x) => x.slug === slug);
  return r?.name || slug;
}
