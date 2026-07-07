// Pure decision for how to handle a Stripe webhook after attempting to record it
// in stripe_events (idempotency, F6 + review bolk 3a). Client-free and runtime-
// agnostic so it can be unit-tested under Node/vitest; the caller owns the DB I/O.
//
// The insert of the event row is the dedup gate:
//   - success              → first time we see this event, process it.
//   - 23505 (unique)       → seen before; skip only if the prior attempt fully
//                            completed (processed_at set), else re-process (all
//                            handlers are idempotent upserts).
//   - any other insert error → NO dedup record was written, so processing now
//                            would risk double-processing on Stripe's retry.
//                            Fail so the caller returns non-200 and Stripe retries
//                            against a clean state.

export type WebhookGuard =
  | { action: "process" }
  | { action: "skip" }
  | { action: "reprocess" }
  | { action: "fail"; reason: string };

export function decideWebhookGuard(
  insertError: { code?: string; message?: string } | null | undefined,
  existingProcessedAt: string | null | undefined,
): WebhookGuard {
  if (!insertError) return { action: "process" };
  if (insertError.code === "23505") {
    return existingProcessedAt ? { action: "skip" } : { action: "reprocess" };
  }
  return { action: "fail", reason: insertError.message ?? "stripe_events insert failed" };
}
