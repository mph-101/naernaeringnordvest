import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface Props {
  language: "no" | "en";
}

// Generate a valid completed Sudoku board using backtracking
const generateFullBoard = (): number[][] => {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));

  const isValid = (b: number[][], r: number, c: number, n: number) => {
    for (let i = 0; i < 9; i++) {
      if (b[r][i] === n || b[i][c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++)
      for (let j = bc; j < bc + 3; j++)
        if (b[i][j] === n) return false;
    return true;
  };

  const solve = (b: number[][]): boolean => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const n of nums) {
            if (isValid(b, r, c, n)) {
              b[r][c] = n;
              if (solve(b)) return true;
              b[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  solve(board);
  return board;
};

const createPuzzle = (difficulty: number = 40) => {
  const solution = generateFullBoard();
  const puzzle = solution.map((r) => [...r]);
  let removed = 0;
  const positions = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
  for (const pos of positions) {
    if (removed >= difficulty) break;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    puzzle[r][c] = 0;
    removed++;
  }
  return { puzzle, solution };
};

export function SudokuGame({ language }: Props) {
  const isNo = language === "no";

  const [{ puzzle, solution }, setGame] = useState(() => createPuzzle(35));
  const [board, setBoard] = useState<number[][]>(() => puzzle.map((r) => [...r]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const isGiven = useCallback(
    (r: number, c: number) => puzzle[r][c] !== 0,
    [puzzle]
  );

  const handleCellClick = (r: number, c: number) => {
    if (!isGiven(r, c)) setSelected([r, c]);
  };

  const handleNumber = (n: number) => {
    if (!selected) return;
    const [r, c] = selected;
    if (isGiven(r, c)) return;
    const next = board.map((row) => [...row]);
    next[r][c] = n;
    setBoard(next);

    const newErrors = new Set(errors);
    const key = `${r}-${c}`;
    if (n !== 0 && n !== solution[r][c]) {
      newErrors.add(key);
    } else {
      newErrors.delete(key);
    }
    setErrors(newErrors);

    // Check win
    if (n !== 0 && next.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]))) {
      toast.success(isNo ? "🎉 Gratulerer! Du løste puslespillet!" : "🎉 Congratulations! You solved it!");
    }
  };

  const handleHint = () => {
    if (!selected) {
      toast.info(isNo ? "Velg en rute først" : "Select a cell first");
      return;
    }
    const [r, c] = selected;
    if (isGiven(r, c)) return;
    const next = board.map((row) => [...row]);
    next[r][c] = solution[r][c];
    setBoard(next);
    const newErrors = new Set(errors);
    newErrors.delete(`${r}-${c}`);
    setErrors(newErrors);
  };

  const newGame = () => {
    const g = createPuzzle(35);
    setGame(g);
    setBoard(g.puzzle.map((r) => [...r]));
    setSelected(null);
    setErrors(new Set());
  };

  const sameBlock = (r1: number, c1: number, r2: number, c2: number) =>
    Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{isNo ? "Sudoku" : "Sudoku"}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleHint}>
              <Lightbulb className="h-4 w-4 mr-1" />
              {isNo ? "Hint" : "Hint"}
            </Button>
            <Button variant="outline" size="sm" onClick={newGame}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {isNo ? "Nytt" : "New"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {/* Board */}
        <div className="grid grid-cols-9 border-2 border-foreground/60 rounded overflow-hidden select-none" style={{ width: "min(100%, 360px)", aspectRatio: "1" }}>
          {board.map((row, r) =>
            row.map((val, c) => {
              const isSel = selected && selected[0] === r && selected[1] === c;
              const isHighlight = selected && (selected[0] === r || selected[1] === c || sameBlock(selected[0], selected[1], r, c));
              const isErr = errors.has(`${r}-${c}`);
              const given = isGiven(r, c);

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={[
                    "flex items-center justify-center text-sm sm:text-base font-semibold transition-colors",
                    "border-r border-b border-border/40",
                    c % 3 === 2 && c !== 8 ? "border-r-foreground/40" : "",
                    r % 3 === 2 && r !== 8 ? "border-b-foreground/40" : "",
                    isSel ? "bg-primary/20" : isHighlight ? "bg-muted" : "bg-card",
                    isErr ? "text-destructive" : given ? "text-foreground font-bold" : "text-primary",
                    !given ? "cursor-pointer hover:bg-accent/40" : "",
                  ].join(" ")}
                  style={{ aspectRatio: "1" }}
                >
                  {val !== 0 ? val : ""}
                </button>
              );
            })
          )}
        </div>

        {/* Number pad */}
        <div className="flex gap-1.5 flex-wrap justify-center">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Button key={n} variant="outline" size="sm" className="w-9 h-9 text-base font-bold" onClick={() => handleNumber(n)}>
              {n}
            </Button>
          ))}
          <Button variant="ghost" size="sm" className="w-9 h-9 text-base" onClick={() => handleNumber(0)}>
            ✕
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
