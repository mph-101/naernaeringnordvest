import { useEffect, useRef, useState } from "react";
import { Radio, Loader2, AlertCircle, Volume2, VolumeX } from "lucide-react";

interface Props {
  playbackId: string;
  title?: string | null;
}

/**
 * Plays a Cloudflare Stream HLS feed. Uses native HLS on Safari and
 * dynamically loads hls.js from a CDN on other browsers. We avoid
 * adding hls.js as an npm dep to keep the bundle lean — the player
 * is only used on profile pages where someone is currently live.
 */
export function LiveStreamPlayer({ playbackId, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const url = `https://customer-${getCustomerSubdomain()}.cloudflarestream.com/${playbackId}/manifest/video.m3u8`;

    // Native HLS on Safari (and iOS WebView)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadeddata", () => setLoading(false), { once: true });
      video.addEventListener("error", () => setError("Kunne ikke laste stream"), { once: true });
      return;
    }

    // hls.js for everything else
    let hls: any = null;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import(/* @vite-ignore */ "https://esm.sh/hls.js@1.5.18");
        if (cancelled) return;
        const Hls = (mod as any).default || (mod as any);
        if (!Hls?.isSupported?.()) {
          setError("Nettleseren støtter ikke HLS");
          return;
        }
        hls = new Hls({ liveDurationInfinity: true });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          if (data?.fatal) setError("Stream-feil");
        });
      } catch (e) {
        setError("Kunne ikke laste videospiller");
      }
    })();

    return () => {
      cancelled = true;
      if (hls) hls.destroy?.();
    };
  }, [playbackId]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div className="bg-black rounded-2xl overflow-hidden border border-border relative aspect-video">
      <video
        ref={videoRef}
        className="w-full h-full"
        autoPlay
        muted
        playsInline
        controls
      />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 flex-col gap-2 text-white p-6 text-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {/* Live badge overlay */}
      {/* Rustrose er reservert feil — direktesending er ikke en alarm */}
      <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-subhead font-bold">
        <Radio className="w-3 h-3" />
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        LIVE
      </div>
      {/* Mute toggle (own button since iOS sometimes hides native controls until tapped) */}
      <button
        onClick={toggleMute}
        className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
        aria-label={muted ? "Slå på lyd" : "Mute"}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
      {title && (
        <div className="absolute bottom-3 left-3 right-3 text-white text-sm font-subhead font-semibold drop-shadow-md">
          {title}
        </div>
      )}
    </div>
  );
}

// Cloudflare Stream serves manifests under customer-<subdomain>.cloudflarestream.com.
// Set NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN at build time, with a safe
// fallback to "cloudflarestream" so playback still works in dev.
function getCustomerSubdomain(): string {
  const env = (typeof process !== "undefined" && (process as any).env) || {};
  return (env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN as string) || "cloudflarestream";
}
