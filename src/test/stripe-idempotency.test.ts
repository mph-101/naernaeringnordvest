import { describe, it, expect } from "vitest";
import { decideWebhookGuard } from "../../supabase/functions/_shared/webhook-idempotency";

describe("decideWebhookGuard — Stripe webhook idempotency (F6 + bolk 3a)", () => {
  it("processes a fresh event (no insert error)", () => {
    expect(decideWebhookGuard(null, null)).toEqual({ action: "process" });
  });

  it("skips a duplicate that already fully processed", () => {
    const guard = decideWebhookGuard({ code: "23505" }, "2026-07-07T10:00:00Z");
    expect(guard).toEqual({ action: "skip" });
  });

  it("reprocesses a duplicate whose prior attempt did not complete", () => {
    expect(decideWebhookGuard({ code: "23505" }, null)).toEqual({ action: "reprocess" });
    expect(decideWebhookGuard({ code: "23505" }, undefined)).toEqual({ action: "reprocess" });
  });

  it("FAILS (does not silently process) on a non-duplicate insert error", () => {
    // Regression guard for the bolk-3a fix: a transient/other insert error means
    // no dedup record was written, so we must NOT process — we fail so Stripe retries.
    const guard = decideWebhookGuard({ code: "42P01", message: "relation does not exist" }, null);
    expect(guard.action).toBe("fail");
    expect((guard as { reason: string }).reason).toContain("relation does not exist");
  });

  it("failure reason falls back to a default message", () => {
    const guard = decideWebhookGuard({ code: "08006" }, null);
    expect(guard).toEqual({ action: "fail", reason: "stripe_events insert failed" });
  });
});
