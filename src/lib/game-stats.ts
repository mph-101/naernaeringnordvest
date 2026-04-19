/**
 * Lightweight localStorage-backed stats for mini games.
 * Tracks best score (lowest = best for time/attempts), average and number of completions.
 */

export interface GameStats {
  best: number | null;
  avg: number | null;
  plays: number;
}

const KEY_PREFIX = "nn_game_stats:";

interface RawStats {
  best: number | null;
  total: number; // sum of all scores
  plays: number;
}

function read(key: string): RawStats {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    if (!raw) return { best: null, total: 0, plays: 0 };
    const parsed = JSON.parse(raw);
    return {
      best: typeof parsed.best === "number" ? parsed.best : null,
      total: typeof parsed.total === "number" ? parsed.total : 0,
      plays: typeof parsed.plays === "number" ? parsed.plays : 0,
    };
  } catch {
    return { best: null, total: 0, plays: 0 };
  }
}

function write(key: string, data: RawStats) {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export function getStats(key: string): GameStats {
  const r = read(key);
  return {
    best: r.best,
    avg: r.plays > 0 ? r.total / r.plays : null,
    plays: r.plays,
  };
}

/**
 * Record a completed run. `lowerIsBetter` is true for time/attempts.
 * Returns the updated stats and whether this run was a new best.
 */
export function recordRun(
  key: string,
  score: number,
  lowerIsBetter = true,
): { stats: GameStats; newBest: boolean } {
  const r = read(key);
  const isBest =
    r.best === null || (lowerIsBetter ? score < r.best : score > r.best);
  const next: RawStats = {
    best: isBest ? score : r.best,
    total: r.total + score,
    plays: r.plays + 1,
  };
  write(key, next);
  return {
    stats: { best: next.best, avg: next.total / next.plays, plays: next.plays },
    newBest: isBest && r.plays > 0,
  };
}

export function formatSeconds(s: number | null): string {
  if (s == null) return "–";
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
}