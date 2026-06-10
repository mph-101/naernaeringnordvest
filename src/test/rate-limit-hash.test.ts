import { describe, it, expect } from "vitest";
// Pure helper from the Deno edge shared module — safe to import in node because
// it touches no Deno globals at import time (the salt is passed explicitly).
import { hashIp } from "../../supabase/functions/_shared/hash";

describe("hashIp — privacy-preserving rate-limit IP hash (F4)", () => {
  it("is deterministic for the same ip + salt", async () => {
    expect(await hashIp("1.2.3.4", "s")).toBe(await hashIp("1.2.3.4", "s"));
  });

  it("changes when the salt changes (so no service-role key is needed)", async () => {
    expect(await hashIp("1.2.3.4", "salt-a")).not.toBe(
      await hashIp("1.2.3.4", "salt-b"),
    );
  });

  it("differs for different IPs under the same salt", async () => {
    expect(await hashIp("1.2.3.4", "s")).not.toBe(await hashIp("5.6.7.8", "s"));
  });

  it("returns a 64-char hex SHA-256 digest", async () => {
    expect(await hashIp("1.2.3.4", "s")).toMatch(/^[a-f0-9]{64}$/);
  });
});
