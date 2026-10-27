/** Types partagés par les fournisseurs et le routeur (sans dépendance serveur, testables). */

export type ProviderId = "groq" | "gemini" | "cerebras" | "openrouter";

export type Provider = {
  id: ProviderId;
  url: string;
  model: string;
  apiKey: string | undefined;
  headers?: Record<string, string>;
};

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatRequest = {
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
};

export type ChatResult = { content: string; inputTokens: number; outputTokens: number };

/** Erreur fournisseur typée : le routeur décide du repli à partir de `code`. */
export class ProviderError extends Error {
  constructor(
    readonly code: "rate_limited" | "timeout" | "http" | "empty",
    readonly retryAfterSeconds: number | null = null,
    readonly status: number | null = null,
  ) {
    super(code);
  }
}
