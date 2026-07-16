import { useLocation, useNavigate } from "react-router-dom";
import { Play, Pause, SkipForward, SkipBack, X, Loader2, Headphones, FileText, Maximize2 } from "lucide-react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Button } from "@/components/ui/button";

export function MiniPlayer() {
  const player = useAudioPlayer();
  const location = useLocation();
  const navigate = useNavigate();

  // Skjul på /lytt (full visning) og når kø er tom
  if (!player.current || location.pathname === "/lytt") return null;

  return (
    // pb-safe: kontrollene skal ikke kollidere med hjemindikator-gesten på iPhone
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${player.progress * 100}%` }}
        />
      </div>
      <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-3">
        <Headphones className="w-4 h-4 text-accent flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-subhead font-medium text-foreground truncate">
            {player.current.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {player.current.author} · {player.mode === "summary" ? "Sammendrag" : "Full lesning"} · {player.currentIndex + 1}/{player.queue.length}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={player.prev} className="h-9 w-9" aria-label="Forrige">
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={player.togglePlay} className="h-9 w-9" aria-label={player.isPlaying ? "Pause" : "Spill"}>
          {player.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : player.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={player.next} className="h-9 w-9" aria-label="Hopp over sak">
          <SkipForward className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={player.toggleMode} className="h-9 w-9 hidden sm:flex" aria-label={player.mode === "summary" ? "Les hele" : "Vis sammendrag"}>
          {player.mode === "summary" ? <FileText className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate("/lytt")} className="h-9 w-9 hidden sm:flex" aria-label="Åpne full spiller">
          <Maximize2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={player.close} className="h-9 w-9" aria-label="Lukk spiller">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
