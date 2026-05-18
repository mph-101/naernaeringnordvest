import { useNavigate } from "react-router-dom";
import { Headphones, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioPlayer, type QueueArticle } from "@/hooks/useAudioPlayer";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  article: QueueArticle;
}

export function ListenToArticleButton({ article }: Props) {
  const player = useAudioPlayer();
  const navigate = useNavigate();
  const { language } = useTheme();
  const isNo = language === "no";

  const isCurrent = player.current?.id === article.id;
  const isThisLoading = isCurrent && player.isLoading;
  const isThisPlaying = isCurrent && player.isPlaying;

  const handleClick = () => {
    if (isCurrent) {
      player.togglePlay();
      return;
    }
    player.startQueue([article], 0);
  };

  return (
    <div className="flex items-center gap-2 mb-8 -mt-2 animate-fade-up" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="rounded-full"
      >
        {isThisLoading ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : isThisPlaying ? (
          <Pause className="w-3.5 h-3.5 mr-1.5" />
        ) : (
          <Headphones className="w-3.5 h-3.5 mr-1.5" />
        )}
        {isCurrent
          ? isThisPlaying
            ? isNo ? "Pause" : "Pause"
            : isNo ? "Spill av" : "Play"
          : isNo ? "Hør artikkelen" : "Listen to article"}
      </Button>
      {isCurrent && (
        <Button variant="ghost" size="sm" onClick={() => navigate("/lytt")}>
          {isNo ? "Åpne spiller" : "Open player"}
        </Button>
      )}
    </div>
  );
}
