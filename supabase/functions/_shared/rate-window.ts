// Fixed-window rate-limit decision (security review F7). Pure and
// runtime-agnostic so it can be unit-tested under Node/vitest; the caller owns
// reading/writing the counter row.

export interface RateWindowDecision {
  // true → reject the request (429) and report retryAfterSeconds.
  limited: boolean;
  retryAfterSeconds: number;
  // What to persist when not limited: either bump the count in the current
  // window, or start a fresh window at `nowMs` with count 1.
  nextCount: number;
  resetWindow: boolean;
}

export function evaluateRateWindow(
  requestCount: number,
  windowStartMs: number,
  nowMs: number,
  maxPerWindow: number,
  windowMs: number,
): RateWindowDecision {
  const elapsed = nowMs - windowStartMs;
  if (elapsed >= windowMs) {
    return { limited: false, retryAfterSeconds: 0, nextCount: 1, resetWindow: true };
  }
  if (requestCount >= maxPerWindow) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((windowMs - elapsed) / 1000),
      nextCount: requestCount,
      resetWindow: false,
    };
  }
  return { limited: false, retryAfterSeconds: 0, nextCount: requestCount + 1, resetWindow: false };
}
