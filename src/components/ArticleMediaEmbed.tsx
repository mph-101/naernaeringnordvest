import { useMemo } from "react";

interface ArticleMediaEmbedProps {
  url: string;
  type: "video" | "podcast";
  title?: string;
}

type Embed =
  | { kind: "iframe"; src: string; aspect: string }
  | { kind: "audio"; src: string }
  | { kind: "link"; src: string };

const parse = (raw: string, type: "video" | "podcast"): Embed | null => {
  const url = raw.trim();
  if (!url) return null;

  // YouTube
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}`, aspect: "aspect-video" };

  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}`, aspect: "aspect-video" };

  // Spotify
  const sp = url.match(/open\.spotify\.com\/(episode|show|track|playlist|album)\/([\w]+)/);
  if (sp) return { kind: "iframe", src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}`, aspect: type === "video" ? "aspect-video" : "h-[152px]" };

  // SoundCloud
  if (/soundcloud\.com\//.test(url)) {
    return {
      kind: "iframe",
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23c17c74&auto_play=false&hide_related=true&show_comments=false&show_user=true`,
      aspect: "h-[166px]",
    };
  }

  // Apple Podcasts
  if (/podcasts\.apple\.com\//.test(url)) {
    const embed = url.replace("podcasts.apple.com", "embed.podcasts.apple.com");
    return { kind: "iframe", src: embed, aspect: "h-[175px]" };
  }

  // Direct media files
  if (/\.(mp3|m4a|wav|ogg|aac)(\?|#|$)/i.test(url)) return { kind: "audio", src: url };
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) {
    return { kind: "iframe", src: url, aspect: "aspect-video" };
  }

  return { kind: "link", src: url };
};

export const ArticleMediaEmbed = ({ url, type, title }: ArticleMediaEmbedProps) => {
  const embed = useMemo(() => parse(url, type), [url, type]);
  if (!embed) return null;

  if (embed.kind === "audio") {
    return (
      <div className="mb-10 rounded-2xl bg-card border border-border p-4 shadow-soft animate-fade-up">
        <audio controls preload="metadata" className="w-full" src={embed.src}>
          <track kind="captions" />
        </audio>
      </div>
    );
  }

  if (embed.kind === "link") {
    return (
      <div className="mb-10 rounded-2xl bg-card border border-border p-4 text-sm">
        <a href={embed.src} target="_blank" rel="noreferrer" className="text-accent underline">
          {embed.src}
        </a>
      </div>
    );
  }

  if (embed.src.match(/\.(mp4|webm|mov)(\?|#|$)/i)) {
    return (
      <div className="mb-10 rounded-2xl overflow-hidden bg-black shadow-soft animate-fade-up">
        <video controls preload="metadata" className="w-full aspect-video" src={embed.src} />
      </div>
    );
  }

  const wrapperClass =
    embed.aspect.startsWith("aspect-") ? `relative w-full ${embed.aspect}` : `relative w-full ${embed.aspect}`;

  return (
    <div className="mb-10 rounded-2xl overflow-hidden bg-card border border-border shadow-soft animate-fade-up">
      <div className={wrapperClass}>
        <iframe
          src={embed.src}
          title={title || (type === "video" ? "Video" : "Lyd")}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
};