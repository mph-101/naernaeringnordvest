import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Loader2, FileText, Headphones, ExternalLink, Lock } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useTheme } from "@/hooks/useTheme";

const SPEEDS = [1, 1.25, 1.5, 2];

const Lytt = () => {
  const player = useAudioPlayer();
  const navigate = useNavigate();
  const { language } = useTheme();
  const isNo = language === "no";

  useEffect(() => {
    if (!player.current && player.queue.length === 0) {
      // Tom kø — send til forside
      navigate("/", { replace: true });
    }
  }, [player.current, player.queue.length, navigate]);

  if (player.audioNotConfigured) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <Headphones className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-headline text-2xl font-semibold text-headline mb-2">
            {isNo ? "Lyd-modus kommer snart" : "Audio mode coming soon"}
          </h1>
          <p className="text-muted-foreground font-body mb-6">
            {isNo
              ? "Vi venter på at redaksjonens stemme-abonnement skal aktiveres. Da kan du høre artikler lest opp i journalistenes egne stemmer."
              : "We're waiting for the editorial voice subscription to be activated. Then you'll be able to hear articles read in the journalists' own voices."}
          </p>
          <Button onClick={() => navigate("/")}>{isNo ? "Tilbake til forsiden" : "Back to home"}</Button>
        </div>
      </div>
    );
  }

  if (!player.current) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          {isNo ? "Tilbake" : "Back"}
        </button>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Headphones className="w-4 h-4 text-accent" />
            <span className="text-xs uppercase tracking-wider text-accent font-medium">
              {isNo ? "Dagens utgave" : "Today's edition"} · {player.currentIndex + 1}/{player.queue.length}
            </span>
          </div>
          <h1 className="font-headline text-2xl font-semibold text-headline mb-2">
            {player.current.title}
          </h1>
          <p className="text-sm text-muted-foreground font-body mb-4">
            {player.current.author} · {player.mode === "summary" ? (isNo ? "Sammendrag" : "Summary") : (isNo ? "Full lesning" : "Full reading")}
          </p>

          {/* Progress */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-6">
            <div className="h-full bg-accent transition-all" style={{ width: `${player.progress * 100}%` }} />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={player.prev} className="h-11 w-11">
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button onClick={player.togglePlay} size="icon" className="h-14 w-14 rounded-full">
              {player.isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : player.isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={player.next} className="h-11 w-11">
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Mode + speed + link */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={player.toggleMode}>
              {player.mode === "summary" ? (
                <><FileText className="w-3.5 h-3.5 mr-1.5" />{isNo ? "Les hele" : "Read full"}</>
              ) : (
                <><Headphones className="w-3.5 h-3.5 mr-1.5" />{isNo ? "Bare sammendrag" : "Summary only"}</>
              )}
            </Button>
            <div className="flex items-center gap-1 bg-secondary rounded-md p-0.5">
              {SPEEDS.map((sp) => (
                <button
                  key={sp}
                  onClick={() => player.setSpeed(sp)}
                  className={`px-2 py-1 text-xs rounded font-medium transition ${
                    player.speed === sp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sp}×
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/article/${player.current.id}`}>
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                {isNo ? "Åpne artikkel" : "Open article"}
              </Link>
            </Button>
          </div>
        </div>

        {/* Kø */}
        <h2 className="font-headline text-lg font-semibold text-headline mt-8 mb-3">
          {isNo ? "Kø" : "Queue"}
        </h2>
        <div className="space-y-2">
          {player.queue.map((a, i) => {
            const active = i === player.currentIndex;
            return (
              <button
                key={a.id}
                onClick={() => player.jumpTo(i)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition ${
                  active ? "border-accent bg-accent/5" : "border-border bg-card hover:border-accent/40"
                }`}
              >
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-subhead font-medium text-foreground line-clamp-2">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {a.author}{a.premium && " · "}{a.premium && <Lock className="w-3 h-3 inline" />}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Lytt;
