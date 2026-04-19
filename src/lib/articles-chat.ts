export interface ArticleSource {
  n: number;
  id: string;
  title: string;
  excerpt: string;
  author: string;
  published_at: string | null;
  rank: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/articles-chat`;

interface StreamArticlesChatOptions {
  messages: ChatMessage[];
  onContent: (chunk: string) => void;
  onSources?: (sources: ArticleSource[]) => void;
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
  let streamDone = false;
  let currentEvent = "message";

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;

    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);

      if (line.startsWith(":") || line.trim() === "") {
        if (line.trim() === "") currentEvent = "message";
        continue;
      }

      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
        continue;
      }

      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        if (currentEvent === "sources" && Array.isArray(parsed.sources)) {
          onSources?.(parsed.sources as ArticleSource[]);
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