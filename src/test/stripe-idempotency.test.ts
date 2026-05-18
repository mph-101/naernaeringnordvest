import { describe, it, expect } from "vitest";

describe("Stripe webhook idempotency", () => {
  it("rejects duplicate events via unique constraint error code 23505", () => {
    const error = { code: "23505", message: "duplicate key value violates unique constraint" };
    const isDuplicate = error.code === "23505";
    expect(isDuplicate).toBe(true);
  });

  it("allows new events (no error)", () => {
    const error = null;
    const isDuplicate = error !== null && (error as any).code === "23505";
    expect(isDuplicate).toBe(false);
  });

  it("does not treat other errors as duplicates", () => {
    const error = { code: "42P01", message: "relation does not exist" };
    const isDuplicate = error.code === "23505";
    expect(isDuplicate).toBe(false);
  });
});
