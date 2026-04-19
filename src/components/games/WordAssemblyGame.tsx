import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Delete, Trophy, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getStats, recordRun, type GameStats } from "@/lib/game-stats";

interface Props {
  language: "no" | "en";
}

const PUZZLES_NO = [
  { letters: "TREDIFB", words: ["BEDRIFT", "DRIFT", "BIT", "RET", "TID", "FRI"] },
  { letters: "KMARDET", words: ["MARKED", "MAKT", "KART", "DRAM", "TERM", "EKTE"] },
  { letters: "VNESTIK", words: ["INNTEKT".replace("N", ""), "VEST", "STEIN", "KNIV", "VITS", "KNEKT"] },
  { letters: "HANDLSE", words: ["HANDEL", "HALS", "LAND", "SAND", "LANDE", "SALE"] },
  { letters: "EKSTVAG", words: ["VEKST", "STAV", "SEKT", "TAKS", "VEST", "GATE"] },
];

const PUZZLES_EN = [
  { letters: "TPROFIG", words: ["PROFIT", "TRIP", "GRIT", "PORT", "RIOT", "FROG"] },
  { letters: "GRWTOHS", words: ["GROWTH", "GROW", "GOTH", "SORT", "WORT", "SHORT"] },
  { letters: "TRADEMS", words: ["TRADES", "TRADE", "STEAM", "MAST", "DARTS", "STEAD"] },
  { letters: "MARKETD", words: ["MARKET", "DARK", "RAKED", "TAMED", "MARK", "TREK"] },
  { letters: "STOCKBY", words: ["STOCK", "COSY", "SOCK", "COST", "BLOCK".replace("L", ""), "TOBY"] },
];

export function WordAssemblyGame({ language }: Props) {
  const isNo = language === "no";
  const puzzles = isNo ? PUZZLES_NO : PUZZLES_EN;

  const [puzzleIdx, setPuzzleIdx] = useState(() => Math.floor(Math.random() * puzzles.length));
  const puzzle = puzzles[puzzleIdx % puzzles.length];

  const [found, setFound] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<{ letter: string; idx: number }[]>([]);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [stats, setStats] = useState<GameStats>(() => getStats("wordassembly"));
  const recordedRef = useRef(false);

  const shuffled = useMemo(() => {
    return puzzle.letters.split("").map((l, i) => ({ letter: l, idx: i })).sort(() => Math.random() - 0.5);
  }, [puzzle]);

  const handleLetterClick = (letter: string, idx: number) => {
    if (usedIndices.has(idx)) return;
    setCurrent((prev) => [...prev, { letter, idx }]);
    setUsedIndices((prev) => new Set(prev).add(idx));
  };

  const handleRemoveLast = () => {
    if (current.length === 0) return;
    const last = current[current.length - 1];
    setCurrent((prev) => prev.slice(0, -1));
    setUsedIndices((prev) => {
      const next = new Set(prev);
      next.delete(last.idx);
      return next;
    });
  };

  const handleSubmit = () => {
    const word = current.map((c) => c.letter).join("");
    if (word.length < 3) {
      toast.error(isNo ? "Minimum 3 bokstaver" : "Minimum 3 letters");
      return;
    }
    if (found.has(word)) {
      toast.info(isNo ? "Allerede funnet!" : "Already found!");
      clearCurrent();
      return;
    }
    if (puzzle.words.includes(word)) {
      const next = new Set(found).add(word);
      setFound(next);
      toast.success(`✓ ${word}`);
      if (next.size === puzzle.words.length) {
        toast.success(isNo ? "🎉 Du fant alle ordene!" : "🎉 You found all words!");
      }
    } else {
      toast.error(isNo ? `"${word}" er ikke i listen` : `"${word}" is not in the list`);
    }
    clearCurrent();
  };

  const clearCurrent = () => {
    setCurrent([]);
    setUsedIndices(new Set());
  };

  const newGame = () => {
    setPuzzleIdx((prev) => (prev + 1) % puzzles.length);
    setFound(new Set());
    clearCurrent();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{isNo ? "Sett sammen ord" : "Word Build"}</CardTitle>
          <Button variant="outline" size="sm" onClick={newGame}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {isNo ? "Nytt" : "New"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5">
        {/* Found words */}
        <div className="flex flex-wrap gap-1.5 justify-center min-h-[28px]">
          {puzzle.words.map((w) => (
            <Badge key={w} variant={found.has(w) ? "default" : "outline"} className={found.has(w) ? "" : "opacity-40"}>
              {found.has(w) ? w : "•".repeat(w.length)}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {found.size}/{puzzle.words.length} {isNo ? "ord funnet" : "words found"}
        </p>

        {/* Current word display */}
        <div className="flex items-center gap-1 min-h-[44px] border rounded-lg px-4 py-2 bg-muted/30 min-w-[200px] justify-center">
          {current.length > 0 ? (
            current.map((c, i) => (
              <span key={i} className="text-xl font-bold text-primary">{c.letter}</span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">{isNo ? "Trykk på bokstaver..." : "Tap letters..."}</span>
          )}
        </div>

        {/* Letter tiles */}
        <div className="flex gap-2 flex-wrap justify-center">
          {shuffled.map(({ letter, idx }) => (
            <Button
              key={idx}
              variant={usedIndices.has(idx) ? "secondary" : "outline"}
              className={`w-12 h-12 text-lg font-bold ${usedIndices.has(idx) ? "opacity-30" : ""}`}
              disabled={usedIndices.has(idx)}
              onClick={() => handleLetterClick(letter, idx)}
            >
              {letter}
            </Button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clearCurrent} disabled={current.length === 0}>
            {isNo ? "Nullstill" : "Clear"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRemoveLast} disabled={current.length === 0}>
            <Delete className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={current.length < 3}>
            {isNo ? "Sjekk" : "Check"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
