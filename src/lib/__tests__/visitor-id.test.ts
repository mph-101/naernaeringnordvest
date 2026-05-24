import { describe, it, expect, beforeEach, vi } from "vitest";
import { getVisitorId } from "../visitor-id";

describe("getVisitorId", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("generates a stable UUID stored in localStorage", () => {
    const id1 = getVisitorId();
    const id2 = getVisitorId();
    expect(id1).toBeTruthy();
    expect(id1).toBe(id2);
    expect((id1 ?? "").length).toBeGreaterThanOrEqual(8);
  });

  it("re-uses the existing localStorage value if already set", () => {
    window.localStorage.setItem("nn_visitor_id", "abcd1234-existing");
    expect(getVisitorId()).toBe("abcd1234-existing");
  });

  it("falls back to sessionStorage when localStorage throws", () => {
    const original = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    try {
      const id = getVisitorId();
      expect(id).toBeTruthy();
      // Subsequent call should reuse from sessionStorage
      expect(getVisitorId()).toBe(id);
    } finally {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });
});
