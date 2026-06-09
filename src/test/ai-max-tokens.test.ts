import { describe, it, expect } from "vitest";
// Pure helper from the Deno edge client — safe to import in node because it
// touches no Deno globals (the CI vitest only runs src/**, so we reach across).
import { resolveMaxTokens } from "../../supabase/functions/_shared/ai-client";

describe("resolveMaxTokens — AI output-token cost guardrail", () => {
  it("honours an explicit per-request cap", () => {
    expect(resolveMaxTokens(1200, undefined)).toBe(1200);
  });

  it("explicit request wins over the env override", () => {
    expect(resolveMaxTokens(1200, "5000")).toBe(1200);
  });

  it("falls back to the env override when no request cap is given", () => {
    expect(resolveMaxTokens(undefined, "5000")).toBe(5000);
  });

  it("falls back to the 8000 default when neither is set", () => {
    expect(resolveMaxTokens(undefined, undefined)).toBe(8000);
  });

  it("ignores non-positive or non-numeric values (never returns unbounded)", () => {
    expect(resolveMaxTokens(0, undefined)).toBe(8000);
    expect(resolveMaxTokens(-100, undefined)).toBe(8000);
    expect(resolveMaxTokens(undefined, "abc")).toBe(8000);
    expect(resolveMaxTokens(undefined, "0")).toBe(8000);
  });
});
