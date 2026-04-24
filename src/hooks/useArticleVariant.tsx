import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/analytics";

export interface ResolvedVariant {
  variant_key: "A" | "B";
  title?: string | null;
  image_url?: string | null;
  image_crop?: any;
  image_focal?: any;
}

const STORAGE_PREFIX = "nn_variant_";

function getOrAssign(articleId: string, hasB: boolean): "A" | "B" {
  try {
    const key = STORAGE_PREFIX + articleId;
    const cached = localStorage.getItem(key);
    if (cached === "A" || cached === "B") return cached;
    const choice: "A" | "B" = hasB && Math.random() < 0.5 ? "B" : "A";
    localStorage.setItem(key, choice);
    return choice;
  } catch {
    return hasB && Math.random() < 0.5 ? "B" : "A";
  }
}

/**
 * Resolve which A/B variant the current viewer should see for an article and
 * log a single impression. Returns `null` until the decision is made.
 */
export function useArticleVariant(articleId: string | undefined): ResolvedVariant | null {
  const [variant, setVariant] = useState<ResolvedVariant | null>(null);

  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("article_variants")
        .select("variant_key, title, image_url, image_crop, image_focal, active")
        .eq("article_id", articleId)
        .eq("variant_key", "B")
        .maybeSingle();

      const hasB = !!(data && data.active && (data.title || data.image_url));
      if (cancelled) return;

      // No active test — skip variant assignment entirely.
      if (!hasB) {
        setVariant(null);
        return;
      }

      const chosen = getOrAssign(articleId, hasB);
      const resolved: ResolvedVariant =
        chosen === "B" && data
          ? {
              variant_key: "B",
              title: data.title,
              image_url: data.image_url,
              image_crop: data.image_crop,
              image_focal: data.image_focal,
            }
          : { variant_key: "A" };

      setVariant(resolved);

      try {
        const sessionId = getSessionId();
        const impressionKey = `${STORAGE_PREFIX}imp_${articleId}`;
        if (!localStorage.getItem(impressionKey)) {
          await supabase.from("article_variant_events" as any).insert({
            article_id: articleId,
            variant_key: resolved.variant_key,
            event_type: "impression",
            session_id: sessionId,
          });
          localStorage.setItem(impressionKey, "1");
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  return variant;
}

/** Log that the viewer completed reading the assigned variant. */
export async function logVariantCompleted(articleId: string, variantKey: "A" | "B") {
  try {
    const completedKey = `${STORAGE_PREFIX}done_${articleId}`;
    if (localStorage.getItem(completedKey)) return;
    const sessionId = getSessionId();
    await supabase.from("article_variant_events" as any).insert({
      article_id: articleId,
      variant_key: variantKey,
      event_type: "completed",
      session_id: sessionId,
    });
    localStorage.setItem(completedKey, "1");
  } catch {
    /* ignore */
  }
}
