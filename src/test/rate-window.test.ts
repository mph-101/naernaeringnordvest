import { describe, it, expect } from "vitest";
// Pure helper from the Deno edge shared module — safe to import in node because
// it touches no Deno globals (caller owns all IO).
import { evaluateRateWindow } from "../../supabase/functions/_shared/rate-window";

const HOUR = 60 * 60 * 1000;
const MAX = 300;

describe("evaluateRateWindow — per-key fair-use cap (F7)", () => {
  it("allows and bumps the count inside the window", () => {
    const d = evaluateRateWindow(5, 0, 1000, MAX, HOUR);
    expect(d.limited).toBe(false);
    expect(d.nextCount).toBe(6);
    expect(d.resetWindow).toBe(false);
  });

  it("limits at the cap and reports seconds until the window resets", () => {
    const halfWay = HOUR / 2;
    const d = evaluateRateWindow(MAX, 0, halfWay, MAX, HOUR);
    expect(d.limited).toBe(true);
    expect(d.retryAfterSeconds).toBe(HOUR / 2 / 1000);
  });

  it("starts a fresh window once the old one has elapsed, even at the cap", () => {
    const d = evaluateRateWindow(MAX, 0, HOUR, MAX, HOUR);
    expect(d.limited).toBe(false);
    expect(d.nextCount).toBe(1);
    expect(d.resetWindow).toBe(true);
  });

  it("limits exactly at the boundary count, not before", () => {
    expect(evaluateRateWindow(MAX - 1, 0, 1000, MAX, HOUR).limited).toBe(false);
    expect(evaluateRateWindow(MAX, 0, 1000, MAX, HOUR).limited).toBe(true);
  });

  it("retry-after rounds up to whole seconds", () => {
    // 100ms into the window → 3599.9s left → 3600 rounded up
    const d = evaluateRateWindow(MAX, 0, 100, MAX, HOUR);
    expect(d.retryAfterSeconds).toBe(3600);
  });
});
