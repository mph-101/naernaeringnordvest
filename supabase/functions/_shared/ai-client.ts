/**
 * Provider-agnostic AI client. Talks the OpenAI Chat Completions wire
 * format, so any OpenAI-compatible endpoint works:
 *   - OpenRouter (default)            https://openrouter.ai/api/v1
 *   - Direct OpenAI                   https://api.openai.com/v1
 *   - DeepInfra, Together, Fireworks  (set AI_BASE_URL accordingly)
 *
 * Required env vars:
 *   AI_API_KEY  - bearer token for the chosen provider
 * Optional env vars:
 *   AI_BASE_URL - defaults to OpenRouter
 *   AI_SITE_URL - sent as HTTP-Referer (OpenRouter analytics)
 *   AI_APP_NAME - sent as X-Title (OpenRouter analytics)
 *
 * Removing Lovable lock-in: we no longer read LOVABLE_API_KEY anywhere.
 * Switch providers by changing AI_BASE_URL + AI_API_KEY in secrets.
 */

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_SITE_URL = "https://naernaeringnordvest.vercel.app";
const DEFAULT_APP_NAME = "Nær Næring Nordvest";

/**
 * Cost guardrail: cap output tokens on every non-streaming completion so a
 * runaway prompt (or a future model swap that drops the implicit limit)
 * cannot generate unbounded — and unbounded billing. Chosen high enough to
 * cover article-length output (a full draft/translation of ~20k input chars
 * is ~5-6k output tokens), low enough to stop a loop. Callers that need a
 * tighter cap pass their own `max_tokens`; an override comes from
 * AI_MAX_TOKENS. Streaming callers (aiFetch) must set their own cap.
 */
const DEFAULT_MAX_TOKENS = 8000;

/**
 * Request timeouts (ms). Deno's fetch has no default timeout, so a hung upstream
 * (socket open, no response) blocks the whole edge invocation until the platform
 * wall-clock kills it. Bound it with an AbortSignal instead. Overridable via env.
 * Non-streaming completions must finish within CHAT; streaming (aiFetch) gets a
 * larger bound since it reads the body over time — long enough for any realistic
 * answer, short enough to catch a true hang before the platform kill.
 * NB: read the env inside the functions, never at module top-level — this module
 * is imported by the vitest suite where `Deno` is undefined.
 */
const DEFAULT_CHAT_TIMEOUT_MS = 60_000;
const DEFAULT_STREAM_TIMEOUT_MS = 120_000;

/** Resolve the output-token cap for a request. Pure — covered by unit test. */
export function resolveMaxTokens(
  requested: number | undefined,
  envValue: string | undefined,
): number {
  if (typeof requested === "number" && requested > 0) return requested;
  const fromEnv = envValue ? Number(envValue) : NaN;
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_MAX_TOKENS;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | unknown;
  name?: string;
  tool_call_id?: string;
  tool_calls?: unknown;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: unknown;
  tools?: unknown;
  tool_choice?: unknown;
  stream?: boolean;
  /** Provider-specific extras passed through to the upstream API */
  [extra: string]: unknown;
}

export interface ChatCompletionResponse {
  id?: string;
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: unknown;
    };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

function getConfig() {
  const apiKey = Deno.env.get("AI_API_KEY");
  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured. Set it in Supabase secrets.");
  }
  return {
    baseUrl: (Deno.env.get("AI_BASE_URL") || DEFAULT_BASE_URL).replace(/\/$/, ""),
    apiKey,
    siteUrl: Deno.env.get("AI_SITE_URL") || DEFAULT_SITE_URL,
    appName: Deno.env.get("AI_APP_NAME") || DEFAULT_APP_NAME,
  };
}

/**
 * Send a chat-completions request. Returns the raw response JSON so
 * callers can read tool_calls, finish_reason etc.
 *
 * Throws an Error with the upstream status code in its message when the
 * provider returns non-2xx. Callers can pattern-match on the status to
 * preserve their existing 402/429 handling.
 */
export async function aiChatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const { baseUrl, apiKey, siteUrl, appName } = getConfig();

  const body: ChatCompletionRequest = {
    ...req,
    max_tokens: resolveMaxTokens(req.max_tokens, Deno.env.get("AI_MAX_TOKENS")),
  };

  const timeoutMs = Number(Deno.env.get("AI_TIMEOUT_MS")) || DEFAULT_CHAT_TIMEOUT_MS;
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl,
      "X-Title": appName,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new AiGatewayError(resp.status, errText);
  }

  return (await resp.json()) as ChatCompletionResponse;
}

/**
 * Raw fetch in case a caller needs streaming or non-JSON responses
 * (e.g. SSE for articles-chat). Same auth headers, same base URL.
 */
export async function aiFetch(path: string, init: RequestInit): Promise<Response> {
  const { baseUrl, apiKey, siteUrl, appName } = getConfig();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("HTTP-Referer", siteUrl);
  headers.set("X-Title", appName);
  // Respect a caller-supplied signal; otherwise bound the request so a hung
  // upstream can't stall the invocation until the platform kill.
  const timeoutMs = Number(Deno.env.get("AI_STREAM_TIMEOUT_MS")) || DEFAULT_STREAM_TIMEOUT_MS;
  const signal = init.signal ?? AbortSignal.timeout(timeoutMs);
  return fetch(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers, signal });
}

export class AiGatewayError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`AI gateway error ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}
