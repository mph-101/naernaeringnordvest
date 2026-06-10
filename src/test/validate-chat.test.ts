import { describe, it, expect } from "vitest";
import {
  validateChatMessages,
  DEFAULT_CHAT_LIMITS,
} from "../../supabase/functions/_shared/validate-chat";

describe("validateChatMessages — AI chat input guardrail (F5)", () => {
  it("accepts a well-formed conversation", () => {
    expect(
      validateChatMessages([
        { role: "user", content: "Hei" },
        { role: "assistant", content: "Hei, hva lurer du på?" },
      ]),
    ).toBeNull();
  });

  it("rejects a missing/empty array", () => {
    expect(validateChatMessages(undefined)).toBe("messages mangler");
    expect(validateChatMessages([])).toBe("messages mangler");
  });

  it("rejects an unknown role or non-string content", () => {
    expect(validateChatMessages([{ role: "system", content: "x" }])).toBe("Ugyldig meldingsformat");
    expect(validateChatMessages([{ role: "user", content: 123 }])).toBe("Ugyldig meldingsformat");
    expect(validateChatMessages(["nope"])).toBe("Ugyldig meldingsformat");
  });

  it("rejects too many messages", () => {
    const many = Array.from({ length: DEFAULT_CHAT_LIMITS.maxMessages + 1 }, () => ({
      role: "user" as const,
      content: "x",
    }));
    expect(validateChatMessages(many)).toBe("For mange meldinger");
  });

  it("rejects an over-long single message", () => {
    const big = "a".repeat(DEFAULT_CHAT_LIMITS.maxMessageChars + 1);
    expect(validateChatMessages([{ role: "user", content: big }])).toBe("En melding er for lang");
  });

  it("rejects an over-long total conversation", () => {
    const chunk = "a".repeat(DEFAULT_CHAT_LIMITS.maxMessageChars);
    const msgs = Array.from({ length: 4 }, () => ({ role: "user" as const, content: chunk }));
    // 4 * 8000 = 32000 > 24000 total cap, but each message is within the per-message cap
    expect(validateChatMessages(msgs)).toBe("Samtalen er for lang");
  });
});
