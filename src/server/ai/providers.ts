import "server-only";
import { env } from "@/server/env";
import { ProviderError, type ChatRequest, type ChatResult, type Provider, type ProviderId } from "./types";

/**
 * Fournisseurs LLM gratuits, tous appelés via leur API compatible OpenAI (aucun SDK, aucun coût fixe).
 * Un fournisseur sans clé est simplement ignoré par le routeur.
 */

export const providers: Record<ProviderId, Provider> = {
  groq: {
    id: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: env.AI_MODEL_GROQ,
    apiKey: env.GROQ_API_KEY,
  },
  gemini: {
    id: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: env.AI_MODEL_GEMINI,
    apiKey: env.GEMINI_API_KEY,
  },
  cerebras: {
    id: "cerebras",
    url: "https://api.cerebras.ai/v1/chat/completions",
    model: env.AI_MODEL_CEREBRAS,
    apiKey: env.CEREBRAS_API_KEY,
  },
  openrouter: {
    id: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: env.AI_MODEL_OPENROUTER,
    apiKey: env.OPENROUTER_API_KEY,
    headers: { "HTTP-Referer": env.APP_URL, "X-Title": "Idevia" },
  },
};

export async function callChat(provider: Provider, request: ChatRequest, signal: AbortSignal): Promise<ChatResult> {
  let response: Response;
  try {
    response = await fetch(provider.url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
        ...provider.headers,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        response_format: { type: "json_object" },
      }),
    });
  } catch (error) {
    if (signal.aborted) throw new ProviderError("timeout");
    throw error;
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after"));
    throw new ProviderError("rate_limited", Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null, 429);
  }
  if (!response.ok) throw new ProviderError("http", null, response.status);

  const body = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new ProviderError("empty");
  return {
    content,
    inputTokens: body.usage?.prompt_tokens ?? 0,
    outputTokens: body.usage?.completion_tokens ?? 0,
  };
}
