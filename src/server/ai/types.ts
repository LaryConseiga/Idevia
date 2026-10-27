/** Types partagés par les fournisseurs et le routeur (sans dépendance serveur, testables). */

/**
 * Une « voie » = un fournisseur + un modèle. Un même fournisseur peut offrir plusieurs voies
 * (ex. Groq : un modèle très rapide pour l'entretien, un modèle qui raisonne pour juger les idées).
 */
export type ProviderId = "groq_fast" | "groq_reasoning" | "gemini" | "gemini_lite" | "openrouter" | "cerebras";

export type Provider = {
  id: ProviderId;
  url: string;
  model: string;
  apiKey: string | undefined;
  headers?: Record<string, string>;
  /** Paramètres propres au modèle (ex. effort de raisonnement), ajoutés au corps de la requête. */
  extra?: Record<string, unknown>;
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
