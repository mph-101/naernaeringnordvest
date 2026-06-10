// Input validation for chat-style AI endpoints (security review F5). Caps
// client-controlled input before it reaches the AI gateway (DoS / cost abuse)
// and rejects malformed message shapes. Pure and runtime-agnostic so it can be
// unit-tested under Node/vitest.

export interface ChatLimits {
  maxMessages: number;
  maxMessageChars: number;
  maxTotalChars: number;
}

export const DEFAULT_CHAT_LIMITS: ChatLimits = {
  maxMessages: 50,
  maxMessageChars: 8000,
  maxTotalChars: 24000,
};

// Returns an error message if the payload is invalid/oversized, otherwise null.
export function validateChatMessages(
  messages: unknown,
  limits: ChatLimits = DEFAULT_CHAT_LIMITS,
): string | null {
  if (!Array.isArray(messages) || messages.length === 0) return "messages mangler";
  if (messages.length > limits.maxMessages) return "For mange meldinger";

  let totalChars = 0;
  for (const m of messages) {
    if (!m || typeof m !== "object") return "Ugyldig meldingsformat";
    const role = (m as Record<string, unknown>).role;
    const content = (m as Record<string, unknown>).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return "Ugyldig meldingsformat";
    }
    if (content.length > limits.maxMessageChars) return "En melding er for lang";
    totalChars += content.length;
  }
  if (totalChars > limits.maxTotalChars) return "Samtalen er for lang";
  return null;
}
