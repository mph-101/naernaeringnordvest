import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SnakeGameProps {
  language: "no" | "en";
}

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Cell = { x: number; y: number };
type Speed = "slow" | "normal" | "fast";

interface LeaderRow {
  id: string;
  user_id: string;
  display_name: string | null;
  score: number;
  created_at: string;
}

const GRID = 17;
const SPEED_MS: Record<Speed, number> = { slow: 200, normal: 130, fast: 80 };
const BEST_KEY: Record<Speed, string> = {
  slow: "snake_best_slow",
  normal: "snake_best",
  fast: "snake_best_fast",
};
const OPT_OUT_KEY = "snake_leaderboard_opt_out";

const DIRS: Record<Dir, Cell> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

const initialSnake = (): Cell[] => [
  { x: 8, y: 8 },
  { x: 7, y: 8 },
  { x: 6, y: 8 },
];

const randomFood = (snake: Cell[]): Cell => {
  while (true) {
    const c = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!snake.some((s) => s.x === c.x && s.y === c.y)) return c;
  }
};

export const SnakeGame = ({ language }: SnakeGameProps) => {
  const isNo = language === "no";
  const { user } = useAuth();
  const [snake, setSnake] = useState<Cell[]>(initialSnake);
  const [food, setFood] = useState<Cell>(() => randomFood(initialSnake()));
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeedState] = useState<Speed>(() => {
    if (typeof window === "undefined") return "normal";
    const stored = localStorage.getItem("snake_speed") as Speed | null;
    return stored && stored in SPEED_MS ? stored : "normal";
  });
  const [best, setBest] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(BEST_KEY[speed]) || "0");
  });
  const [optOut, setOptOut] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  });
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const submittedScoreRef = useRef<{ key: string; score: number } | null>(null);

  const dirQueue = useRef<Dir[]>([]);
  const lastDir = useRef<Dir>("RIGHT");

  const reset = useCallback(() => {
    const s = initialSnake();
    setSnake(s);
    setFood(randomFood(s));
    setDir("RIGHT");
    lastDir.current = "RIGHT";
    dirQueue.current = [];
    setScore(0);
    setGameOver(false);
    setRunning(false);
  }, []);

  const queueDir = useCallback((next: Dir) => {
    const lastQueued = dirQueue.current[dirQueue.current.length - 1] ?? lastDir.current;
    if (next === lastQueued || next === OPPOSITE[lastQueued]) return;
    dirQueue.current.push(next);
    if (!running && !gameOver) setRunning(true);
  }, [running, gameOver]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "UP",
        ArrowDown: "DOWN",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT",
        w: "UP",
        s: "DOWN",
        a: "LEFT",
        d: "RIGHT",
        W: "UP",
        S: "DOWN",
        A: "LEFT",
        D: "RIGHT",
      };
      if (e.key === " ") {
        e.preventDefault();
        if (gameOver) reset();
        else setRunning((r) => !r);
        return;
      }
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        queueDir(d);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queueDir, reset, gameOver]);

  useEffect(() => {
    if (!running || gameOver) return;
    const id = window.setInterval(() => {
      setSnake((prev) => {
        const nextDir = dirQueue.current.shift() ?? lastDir.current;
        lastDir.current = nextDir;
        setDir(nextDir);
        const delta = DIRS[nextDir];
        const head = { x: prev[0].x + delta.x, y: prev[0].y + delta.y };

        if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }
        if (prev.some((s) => s.x === head.x && s.y === head.y)) {
          setGameOver(true);
          setRunning(false);
          return prev;
        }

        const ate = head.x === food.x && head.y === food.y;
        const next = ate ? [head, ...prev] : [head, ...prev.slice(0, -1)];

        if (ate) {
          setScore((sc) => {
            const n = sc + 1;
            setBest((b) => {
              if (n > b) {
                localStorage.setItem(BEST_KEY[speed], String(n));
                return n;
              }
              return b;
            });
            return n;
          });
          setFood(randomFood(next));
        }
        return next;
      });
    }, SPEED_MS[speed]);
    return () => clearInterval(id);
  }, [running, gameOver, food, speed]);

  const setSpeed = useCallback((s: Speed) => {
    setSpeedState(s);
    if (typeof window !== "undefined") localStorage.setItem("snake_speed", s);
    setBest(Number(localStorage.getItem(BEST_KEY[s]) || "0"));
  }, []);

  const loadLeaderboard = useCallback(async (s: Speed) => {
    setLoadingBoard(true);
    const { data, error } = await supabase
      .from("snake_scores")
      .select("id, user_id, display_name, score, created_at")
      .eq("speed", s)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(10);
    if (!error && data) setLeaderboard(data as LeaderRow[]);
    setLoadingBoard(false);
  }, []);

  useEffect(() => {
    loadLeaderboard(speed);
    submittedScoreRef.current = null;
  }, [speed, loadLeaderboard]);

  // Submit score on game over
  useEffect(() => {
    if (!gameOver || score <= 0 || optOut || !user) return;
    const key = `${user.id}-${speed}`;
    if (submittedScoreRef.current?.key === key && submittedScoreRef.current.score >= score) return;
    submittedScoreRef.current = { key, score };

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const displayName =
        profile?.display_name ||
        user.email?.split("@")[0] ||
        (isNo ? "Anonym" : "Anonymous");

      const { error } = await supabase.from("snake_scores").insert({
        user_id: user.id,
        display_name: displayName,
        speed,
        score,
      });
      if (!error) {
        loadLeaderboard(speed);
      }
    })();
  }, [gameOver, score, optOut, user, speed, loadLeaderboard, isNo]);

  const toggleOptOut = useCallback(
    async (next: boolean) => {
      setOptOut(next);
      localStorage.setItem(OPT_OUT_KEY, next ? "1" : "0");
      if (next && user) {
        // remove existing entries for this user
        const { error } = await supabase.from("snake_scores").delete().eq("user_id", user.id);
        if (!error) {
          toast.success(
            isNo ? "Du er fjernet fra topplisten" : "You have been removed from the leaderboard"
          );
          loadLeaderboard(speed);
        }
      } else if (!next) {
        toast.success(isNo ? "Rekorder lagres igjen" : "Scores will be saved again");
      }
    },
    [user, isNo, loadLeaderboard, speed]
  );

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) queueDir(dx > 0 ? "RIGHT" : "LEFT");
    else queueDir(dy > 0 ? "DOWN" : "UP");
    touchStart.current = null;
  };

  const speedOptions: { id: Speed; label: string }[] = [
    { id: "slow", label: isNo ? "Langsom" : "Slow" },
    { id: "normal", label: isNo ? "Normal" : "Normal" },
    { id: "fast", label: isNo ? "Rask" : "Fast" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
          <div className="flex gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">{isNo ? "Poeng" : "Score"}</div>
              <div className="font-bold text-lg text-foreground">{score}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{isNo ? "Best" : "Best"}</div>
              <div className="font-bold text-lg text-primary">{best}</div>
            </div>
          </div>

          <div className="inline-flex items-center bg-secondary rounded-full p-1 text-xs">
            {speedOptions.map((s) => {
              const active = speed === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSpeed(s.id);
                    reset();
                  }}
                  className={`px-3 py-1 rounded-full font-medium transition-all ${
                    active
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={
                    isNo
                      ? "Endring nullstiller spillet og bytter rekord-sporing"
                      : "Changing resets the game and switches best-score tracking"
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => (gameOver ? reset() : setRunning((r) => !r))}
            >
              {gameOver ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {isNo ? "Ny" : "New"}
                </>
              ) : running ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  {isNo ? "Pause" : "Pause"}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  {isNo ? "Start" : "Start"}
                </>
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset} title={isNo ? "Nullstill" : "Reset"}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          className="relative mx-auto bg-muted/30 rounded-lg border border-border overflow-hidden touch-none select-none"
          style={{ aspectRatio: "1 / 1", maxWidth: 420 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${GRID}, 1fr)`,
              gridTemplateRows: `repeat(${GRID}, 1fr)`,
            }}
          >
            {Array.from({ length: GRID * GRID }).map((_, i) => {
              const x = i % GRID;
              const y = Math.floor(i / GRID);
              const isFood = food.x === x && food.y === y;
              const segIdx = snake.findIndex((s) => s.x === x && s.y === y);
              const isHead = segIdx === 0;
              const isBody = segIdx > 0;
              return (
                <div key={i} className="relative">
                  {isFood && (
                    <div className="absolute inset-1 rounded-full bg-destructive shadow-soft" />
                  )}
                  {isBody && <div className="absolute inset-[2px] rounded-sm bg-primary/70" />}
                  {isHead && (
                    <div className="absolute inset-[1px] rounded-md bg-primary shadow-soft" />
                  )}
                </div>
              );
            })}
          </div>

          {!running && !gameOver && score === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="text-center px-4">
                <p className="font-headline text-lg text-foreground mb-1">
                  {isNo ? "Klar?" : "Ready?"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isNo
                    ? "Bruk piltaster, WASD eller sveip. Mellomrom = pause."
                    : "Use arrows, WASD or swipe. Space = pause."}
                </p>
              </div>
            </div>
          )}
          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center px-4">
                <p className="font-headline text-xl text-foreground mb-1">
                  {isNo ? "Game over" : "Game over"}
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  {isNo ? "Poeng" : "Score"}: <strong className="text-foreground">{score}</strong>
                </p>
                <Button size="sm" onClick={reset}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {isNo ? "Spill igjen" : "Play again"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 max-w-[200px] mx-auto sm:hidden">
          <div />
          <Button variant="outline" size="sm" onClick={() => queueDir("UP")} aria-label="Up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <div />
          <Button variant="outline" size="sm" onClick={() => queueDir("LEFT")} aria-label="Left">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => queueDir("DOWN")} aria-label="Down">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => queueDir("RIGHT")} aria-label="Right">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3 hidden sm:block">
          {isNo
            ? "Tips: Bruk piltastene eller WASD. Trykk mellomrom for å pause."
            : "Tip: Use arrow keys or WASD. Press space to pause."}
        </p>
        <span className="hidden">{dir}</span>
      </Card>

      <Card className="p-4 sm:p-5 h-fit">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="font-headline text-base text-foreground">
            {isNo ? "Topp 10" : "Top 10"}
          </h3>
          <span className="text-xs text-muted-foreground ml-auto">
            {speedOptions.find((s) => s.id === speed)?.label}
          </span>
        </div>

        {loadingBoard ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {isNo ? "Laster …" : "Loading …"}
          </p>
        ) : leaderboard.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {isNo
              ? "Ingen rekorder ennå. Bli den første!"
              : "No scores yet. Be the first!"}
          </p>
        ) : (
          <ol className="space-y-1">
            {leaderboard.map((row, i) => {
              const isMe = user?.id === row.user_id;
              return (
                <li
                  key={row.id}
                  className={`flex items-center justify-between text-sm rounded-md px-2 py-1.5 ${
                    isMe ? "bg-primary/10 text-foreground" : "text-foreground/90"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs w-5 text-center font-bold ${
                        i === 0
                          ? "text-primary"
                          : i < 3
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate">
                      {row.display_name || (isNo ? "Anonym" : "Anonymous")}
                      {isMe && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({isNo ? "deg" : "you"})
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums">{row.score}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-4 pt-3 border-t border-border">
          {user ? (
            <div className="flex items-start gap-3">
              <Switch
                id="snake-opt-out"
                checked={optOut}
                onCheckedChange={toggleOptOut}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="snake-opt-out" className="text-sm font-medium cursor-pointer">
                  {isNo ? "Ikke lagre rekordene mine" : "Don't save my scores"}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isNo
                    ? "Når du slår dette på, fjernes også eksisterende rekorder fra topplisten."
                    : "When enabled, your existing scores are also removed from the leaderboard."}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isNo
                ? "Logg inn for å lagre rekorder på topplisten."
                : "Sign in to save your scores to the leaderboard."}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
