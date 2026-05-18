import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QueueArticle {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  image_url: string | null;
  premium: boolean;
  region_slug: string | null;
}

interface PlayerState {
  queue: QueueArticle[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  speed: number;
  mode: "summary" | "full";
  progress: number; // 0–1
  currentDuration: number;
  audioNotConfigured: boolean;
}

interface AudioPlayerContextValue extends PlayerState {
  startQueue: (articles: QueueArticle[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  jumpTo: (index: number) => void;
  setSpeed: (s: number) => void;
  toggleMode: () => void;
  close: () => void;
  current: QueueArticle | null;
}

const Ctx = createContext<AudioPlayerContextValue | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    isLoading: false,
    speed: 1,
    mode: "summary",
    progress: 0,
    currentDuration: 0,
    audioNotConfigured: false,
  });

  // Init audio element
  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    a.preload = "auto";
    audioRef.current = a;

    const onEnded = () => {
      setState((s) => {
        const nextIdx = s.currentIndex + 1;
        if (nextIdx >= s.queue.length) {
          return { ...s, isPlaying: false, progress: 0 };
        }
        return { ...s, currentIndex: nextIdx, progress: 0 };
      });
    };
    const onTime = () => {
      if (!a.duration || isNaN(a.duration)) return;
      setState((s) => ({ ...s, progress: a.currentTime / a.duration, currentDuration: a.duration }));
    };
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));

    a.addEventListener("ended", onEnded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("pause", onPause);
    a.addEventListener("play", onPlay);
    return () => {
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("play", onPlay);
      a.pause();
    };
  }, []);

  // Last og spill av når currentIndex/mode endrer seg
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (state.currentIndex < 0 || state.currentIndex >= state.queue.length) return;
    const article = state.queue[state.currentIndex];
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, isLoading: true, progress: 0, audioNotConfigured: false }));
      try {
        const { data, error } = await supabase.functions.invoke("generate-article-audio", {
          body: { articleId: article.id, mode: state.mode },
        });
        if (cancelled) return;
        if (error || !data?.url) {
          const errMsg = (data as any)?.error || error?.message || "Klarte ikke generere lyd";
          if ((data as any)?.error === "AUDIO_NOT_CONFIGURED") {
            setState((s) => ({ ...s, isLoading: false, isPlaying: false, audioNotConfigured: true }));
            return;
          }
          toast.error(errMsg);
          setState((s) => ({ ...s, isLoading: false, isPlaying: false }));
          return;
        }
        a.src = data.url;
        a.playbackRate = state.speed;
        await a.play().catch(() => {});
        setState((s) => ({ ...s, isLoading: false }));
      } catch (e: any) {
        if (cancelled) return;
        toast.error(e.message ?? "Lyd-feil");
        setState((s) => ({ ...s, isLoading: false, isPlaying: false }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentIndex, state.mode]);

  // Sync speed
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = state.speed;
  }, [state.speed]);

  const startQueue = useCallback((articles: QueueArticle[], startIndex = 0) => {
    setState((s) => ({
      ...s,
      queue: articles,
      currentIndex: Math.min(startIndex, articles.length - 1),
      mode: "summary",
      progress: 0,
    }));
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, []);

  const next = useCallback(() => {
    setState((s) => {
      const nx = s.currentIndex + 1;
      if (nx >= s.queue.length) return { ...s, isPlaying: false };
      return { ...s, currentIndex: nx, mode: "summary", progress: 0 };
    });
  }, []);

  const prev = useCallback(() => {
    setState((s) => {
      const px = Math.max(0, s.currentIndex - 1);
      return { ...s, currentIndex: px, mode: "summary", progress: 0 };
    });
  }, []);

  const jumpTo = useCallback((index: number) => {
    setState((s) => {
      if (index < 0 || index >= s.queue.length) return s;
      return { ...s, currentIndex: index, mode: "summary", progress: 0 };
    });
  }, []);

  const setSpeed = useCallback((sp: number) => setState((s) => ({ ...s, speed: sp })), []);

  const toggleMode = useCallback(() => {
    setState((s) => ({ ...s, mode: s.mode === "summary" ? "full" : "summary", progress: 0 }));
  }, []);

  const close = useCallback(() => {
    const a = audioRef.current;
    if (a) { a.pause(); a.src = ""; }
    setState({
      queue: [], currentIndex: -1, isPlaying: false, isLoading: false,
      speed: 1, mode: "summary", progress: 0, currentDuration: 0, audioNotConfigured: false,
    });
  }, []);

  const current = state.currentIndex >= 0 ? state.queue[state.currentIndex] ?? null : null;

  return (
    <Ctx.Provider
      value={{ ...state, current, startQueue, togglePlay, next, prev, jumpTo, setSpeed, toggleMode, close }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudioPlayer må brukes inne i AudioPlayerProvider");
  return ctx;
}
