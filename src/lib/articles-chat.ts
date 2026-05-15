export interface ArticleSource {
  n: number;
  id: string;
  title: string;
  excerpt: string;
  author: string;
  published_at: string | null;
  rank: number;
}

export interface TrustedSource {
  n: number;
  source_name: string;
  source_type: string;
  title: string | null;
  content: string;
  source_url: string | null;
  published_at: string | null;
}

export interface BrregCompany {
  navn: string;
  orgnr: string;
  ansatte: number;
  kommune: string;
  bransje: string;
  stiftet: string;
  konkurs: boolean;
}

export interface BrregResult {
  label: string;
  total: number;
  companies: BrregCompany[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/articles-chat`;

interface StreamArticlesChatOptions {
  messages: ChatMessage[];
  onContent: (chunk: string) => void;
  onSources?: (
    sources: ArticleSource[],
    trustedSources?: TrustedSource[],
    brregResults?: BrregResult[],
  ) => void;
}

export async function streamArticlesChat({
  messages,
  onContent,
  onSources,
}: StreamArticlesChatOptions) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok || !resp.body) {
    const err = await resp.json().catch(() => ({ error: "Ukjent feil" }));
    throw new Error(err.error || "Noe gikk galt, prøv igjen.");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let currentEvent = "message";

  // Keep reading until the underlying stream closes — the edge function
  // appends a custom `event: sources` block AFTER the upstream `[DONE]`,
  // so we cannot bail early on `[DONE]`.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);

      // Blank line = SSE event boundary; reset event type for next block
      if (line.trim() === "") {
        currentEvent = "message";
        continue;
      }

      // Comment line
      if (line.startsWith(":")) continue;

      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
        continue;
      }

      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      // Skip the upstream sentinel but keep reading for our trailing sources event
      if (jsonStr === "[DONE]") continue;

      try {
        const parsed = JSON.parse(jsonStr);
        if (currentEvent === "sources" && Array.isArray(parsed.sources)) {
          onSources?.(
            parsed.sources as ArticleSource[],
            (parsed.trustedSources as TrustedSource[]) || [],
            (parsed.brregResults as BrregResult[]) || [],
          );
          continue;
        }

        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onContent(content);
      } catch {
        textBuffer = `${line}\n${textBuffer}`;
        break;
      }
    }
  }
}