import { config } from "../../../infrastructure/config";

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

export const ollamaProvider = {
  async checkAvailability(): Promise<boolean> {
    try {
      const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async checkModel(model: string): Promise<boolean> {
    try {
      const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return false;
      const body = (await res.json()) as OllamaTagsResponse;
      const modelBase = model.split(":")[0];
      return body.models.some(
        (m) => m.name === model || m.name.startsWith(modelBase)
      );
    } catch {
      return false;
    }
  },

  async chat(
    model: string,
    messages: OllamaMessage[],
    timeoutMs: number
  ): Promise<string> {
    const res = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Ollama returned ${res.status}: ${text}`);
    }

    const body = (await res.json()) as OllamaChatResponse;
    return body.message.content;
  },
};
