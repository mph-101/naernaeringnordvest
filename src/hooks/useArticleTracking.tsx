import { useEffect, useRef } from "react";
import { startArticleView, trackEvent } from "@/lib/analytics";

/**
 * Track an article view: read time, scroll depth, and completion.
 * - Read time only counts seconds where the tab is visible.
 * - Marks `completed` when scroll-depth ≥ 90%.
 * - Persists progress every 10s and on unmount/visibilitychange.
 *
 * Also fires the `article_read` funnel event the first time the user
 * crosses 30% scroll depth — used to measure conversion to engaged reader.
 */
export function useArticleTracking(articleId: string | undefined, premium = false) {
  const handleRef = useRef<{
    update: (s: number, d: number, c: boolean) => Promise<void>;
    end: (s: number, d: number, c: boolean) => Promise<void>;
  } | null>(null);
  const startedRef = useRef(false);
  const firedReadEvent = useRef(false);

  useEffect(() => {
    if (!articleId || startedRef.current) return;
    startedRef.current = true;

    let activeSeconds = 0;
    let lastTick = Date.now();
    let visible = !document.hidden;
    let maxDepth = 0;
    let completed = false;
    let cancelled = false;

    startArticleView(articleId).then((handle) => {
      if (cancelled) return;
      handleRef.current = handle;
      if (premium) {
        // showing the paywall counts as funnel step
        trackEvent("paywall_viewed", { article_id: articleId });
      }
    });

    const tickRead = () => {
      const now = Date.now();
      if (visible) activeSeconds += (now - lastTick) / 1000;
      lastTick = now;
    };

    const computeDepth = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return 100;
      const d = (window.scrollY / docH) * 100;
      if (d > maxDepth) maxDepth = d;
      if (maxDepth >= 90) completed = true;
      if (!firedReadEvent.current && maxDepth >= 30) {
        firedReadEvent.current = true;
        trackEvent("article_read", { article_id: articleId });
      }
    };

    const onScroll = () => computeDepth();
    const onVisibility = () => {
      tickRead();
      visible = !document.hidden;
      lastTick = Date.now();
    };
    const onUnload = () => {
      tickRead();
      computeDepth();
      handleRef.current?.end(activeSeconds, maxDepth, completed);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    const interval = window.setInterval(() => {
      tickRead();
      computeDepth();
      handleRef.current?.update(activeSeconds, maxDepth, completed);
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      tickRead();
      computeDepth();
      handleRef.current?.end(activeSeconds, maxDepth, completed);
    };
  }, [articleId, premium]);
}
