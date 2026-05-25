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

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl,
      "X-Title": appName,
    },
    body: JSON.stringify(req),
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
  return fetch(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers });
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
