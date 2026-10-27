import "server-only";
import { env } from "@/server/env";
import { parseRetryDelay } from "./retry";
import { ProviderError, type ChatRequest, type ChatResult, type Provider, type ProviderId } from "./types";

/**
 * Fournisseurs LLM gratuits, tous appelés via leur API compatible OpenAI (aucun SDK, aucun coût fixe).
 * Un fournisseur sans clé est simplement ignoré par le routeur.
 */

const GROQ = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export const providers: Record<ProviderId, Provider> = {
  groq_fast: { id: "groq_fast", url: GROQ, model: env.AI_MODEL_GROQ_FAST, apiKey: env.GROQ_API_KEY },
  groq_reasoning: {
    id: "groq_reasoning",
    url: GROQ,
    model: env.AI_MODEL_GROQ_REASONING,
    apiKey: env.GROQ_API_KEY,
    extra: { reasoning_effort: "medium" },
  },
  // Les modèles Gemini 3 réfléchissent par défaut : effort réduit pour garder une latence acceptable.
  gemini: { id: "gemini", url: GEMINI, model: env.AI_MODEL_GEMINI, apiKey: env.GEMINI_API_KEY, extra: { reasoning_effort: "low" } },
  gemini_lite: { id: "gemini_lite", url: GEMINI, model: env.AI_MODEL_GEMINI_LITE, apiKey: env.GEMINI_API_KEY },
  openrouter: {
    id: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: env.AI_MODEL_OPENROUTER,
    apiKey: env.OPENROUTER_API_KEY,
    headers: { "HTTP-Referer": env.APP_URL, "X-Title": "Idevia" },
  },
  cerebras: {
    id: "cerebras",
    url: "https://api.cerebras.ai/v1/chat/completions",
    model: env.AI_MODEL_CEREBRAS,
    apiKey: env.CEREBRAS_API_KEY,
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
        ...provider.extra,
      }),
    });
  } catch (error) {
    if (signal.aborted) throw new ProviderError("timeout");
    throw error;
  }

  if (response.status === 429) {
    const header = Number(response.headers.get("retry-after"));
    const retryAfter = Number.isFinite(header) && header > 0 ? header : parseRetryDelay(await response.text().catch(() => ""));
    throw new ProviderError("rate_limited", retryAfter, 429);
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
