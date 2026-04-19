import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trophy, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getStats, recordRun, formatSeconds, type GameStats } from "@/lib/game-stats";

interface Props {
  language: "no" | "en";
}

const WORD_SETS_NO = [
  ["BEDRIFT", "MARKED", "AKSJE", "INNTEKT", "REGION", "VEKST", "BRANSJE"],
  ["HANDEL", "PROFITT", "ANSATT", "KAPITAL", "KUNDE", "SALG", "DRIFT"],
  ["SJEF", "PLAN", "RISIKO", "AVTALE", "BUDSJETT", "STRATEGI", "EKSPORT"],
];

const WORD_SETS_EN = [
  ["MARKET", "GROWTH", "PROFIT", "INVEST", "TRADE", "STOCK", "ASSET"],
  ["CLIENT", "SALES", "BRAND", "VALUE", "BUDGET", "LEADER", "INCOME"],
  ["MERGER", "EQUITY", "YIELD", "SHARE", "PRICE", "AUDIT", "RISK"],
];

const GRID_SIZE = 10;
const DIRECTIONS: [number, number][] = [
  [0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1], [-1, 1],
];

const generateGrid = (words: string[]) => {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
  const placed: { word: string; cells: [number, number][] }[] = [];

  for (const word of words) {
    let attempts = 0;
    while (attempts < 100) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      const cells: [number, number][] = [];
      let fits = true;

      for (let i = 0; i < word.length; i++) {
        const nr = r + dir[0] * i;
        const nc = c + dir[1] * i;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) { fits = false; break; }
        if (grid[nr][nc] !== "" && grid[nr][nc] !== word[i]) { fits = false; break; }
        cells.push([nr, nc]);
      }

      if (fits) {
        cells.forEach(([cr, cc], i) => { grid[cr][cc] = word[i]; });
        placed.push({ word, cells });
        break;
      }
      attempts++;
    }
  }

  // Fill empties
  const letters = "ABCDEFGHIJKLMNOPRSTUVW";
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (grid[r][c] === "") grid[r][c] = letters[Math.floor(Math.random() * letters.length)];

  return { grid, placed };
};

export function WordSearchGame({ language }: Props) {
  const isNo = language === "no";
  const wordSets = isNo ? WORD_SETS_NO : WORD_SETS_EN;

  const newPuzzle = useCallback(() => {
    const words = wordSets[Math.floor(Math.random() * wordSets.length)];
    return { ...generateGrid(words), words };
  }, [wordSets]);

  const [{ grid, placed, words }, setPuzzle] = useState(() => newPuzzle());
  const [found, setFound] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState<[number, number][]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const foundCells = useMemo(() => {
    const set = new Set<string>();
    placed.filter((p) => found.has(p.word)).forEach((p) => p.cells.forEach(([r, c]) => set.add(`${r}-${c}`)));
    return set;
  }, [found, placed]);

  const selectingSet = useMemo(() => new Set(selecting.map(([r, c]) => `${r}-${c}`)), [selecting]);

  const handlePointerDown = (r: number, c: number) => {
    setIsDragging(true);
    setSelecting([[r, c]]);
  };

  const handlePointerEnter = (r: number, c: number) => {
    if (!isDragging) return;
    // Only allow straight-line selections
    if (selecting.length === 0) return;
    const [sr, sc] = selecting[0];
    const dr = Math.sign(r - sr);
    const dc = Math.sign(c - sc);
    if (dr === 0 && dc === 0) return;
    // Rebuild line from start to current
    const cells: [number, number][] = [];
    let cr = sr, cc = sc;
    while (cr >= 0 && cr < GRID_SIZE && cc >= 0 && cc < GRID_SIZE) {
      cells.push([cr, cc]);
      if (cr === r && cc === c) break;
      cr += dr;
      cc += dc;
    }
    if (cells[cells.length - 1]?.[0] === r && cells[cells.length - 1]?.[1] === c) {
      setSelecting(cells);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (selecting.length < 2) { setSelecting([]); return; }
    const selectedWord = selecting.map(([r, c]) => grid[r][c]).join("");
    const match = placed.find((p) => {
      if (p.word !== selectedWord && p.word !== selectedWord.split("").reverse().join("")) return false;
      return true;
    });
    if (match && !found.has(match.word)) {
      const next = new Set(found);
      next.add(match.word);
      setFound(next);
      if (next.size === placed.length) {
        toast.success(isNo ? "🎉 Du fant alle ordene!" : "🎉 You found all words!");
      }
    }
    setSelecting([]);
  };

  const reset = () => {
    setPuzzle(newPuzzle());
    setFound(new Set());
    setSelecting([]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{isNo ? "Finn ord" : "Word Search"}</CardTitle>
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {isNo ? "Nytt" : "New"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {/* Word list */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {words.map((w) => (
            <Badge key={w} variant={found.has(w) ? "default" : "outline"} className={found.has(w) ? "line-through opacity-60" : ""}>
              {w}
            </Badge>
          ))}
        </div>

        {/* Grid */}
        <div
          className="grid select-none touch-none"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, width: "min(100%, 380px)", aspectRatio: "1" }}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r}-${c}`;
              const isFound = foundCells.has(key);
              const isSel = selectingSet.has(key);
              return (
                <button
                  key={key}
                  onPointerDown={() => handlePointerDown(r, c)}
                  onPointerEnter={() => handlePointerEnter(r, c)}
                  className={[
                    "flex items-center justify-center text-xs sm:text-sm font-bold transition-colors rounded-sm",
                    isFound ? "bg-primary/20 text-primary" : isSel ? "bg-accent text-accent-foreground" : "bg-card text-foreground hover:bg-muted",
                  ].join(" ")}
                  style={{ aspectRatio: "1" }}
                >
                  {letter}
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
