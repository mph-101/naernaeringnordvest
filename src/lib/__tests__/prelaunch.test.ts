import { describe, expect, it } from "vitest";
import { prelaunchDecision, type PrelaunchInput } from "@/lib/prelaunch";

const TOKEN = "a-long-enough-preview-token";

const input = (overrides: Partial<PrelaunchInput> = {}): PrelaunchInput => ({
  enabled: "true",
  previewToken: TOKEN,
  pathname: "/",
  previewParam: null,
  previewCookie: null,
  ...overrides,
});

describe("prelaunchDecision", () => {
  it("is off unless PRELAUNCH is explicitly enabled", () => {
    for (const enabled of [undefined, "", "false", "0", "TRUE", "yes"]) {
      expect(prelaunchDecision(input({ enabled })).type).toBe("off");
    }
    expect(prelaunchDecision(input({ enabled: "1" })).type).toBe("gate");
  });

  it("gates every public route", () => {
    for (const pathname of [
      "/",
      "/sak/d6ce9cd2-83ec-4521-8c6c-aaff56e5e6c7",
      "/tall",
      "/naeringspuls",
      "/stillinger",
      "/abonnement",
      "/@magnus",
      "/administrasjon", // must not match the /admin prefix
      "/loginx",
    ]) {
      expect(prelaunchDecision(input({ pathname })).type).toBe("gate");
    }
  });

  it("lets staff, auth, API and unsubscribe routes through", () => {
    for (const pathname of [
      "/admin",
      "/admin/artikler",
      "/login",
      "/nullstill-passord",
      "/api/liveblocks-auth",
      "/unsubscribe",
      "/kommer-snart",
      "/sw.js",
      "/robots.txt",
    ]) {
      expect(prelaunchDecision(input({ pathname })).type).toBe("pass");
    }
  });

  it("grants access for the correct preview link and passes the cookie", () => {
    expect(prelaunchDecision(input({ previewParam: TOKEN })).type).toBe("grant");
    expect(prelaunchDecision(input({ previewCookie: TOKEN })).type).toBe("pass");
  });

  it("rejects wrong tokens", () => {
    expect(prelaunchDecision(input({ previewParam: "wrong" })).type).toBe("gate");
    expect(prelaunchDecision(input({ previewCookie: "wrong" })).type).toBe("gate");
  });

  it("never grants preview access when the token is missing or too short", () => {
    for (const previewToken of [undefined, "", "   ", "short"]) {
      expect(
        prelaunchDecision(input({ previewToken, previewParam: previewToken ?? "" })).type,
      ).toBe("gate");
      expect(
        prelaunchDecision(input({ previewToken, previewCookie: previewToken ?? "" })).type,
      ).toBe("gate");
    }
  });
});
