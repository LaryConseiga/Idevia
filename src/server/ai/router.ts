import type { z } from "zod";
import { ProviderError, type ChatMessage, type ChatRequest, type ChatResult, type Provider, type ProviderId } from "./types";

/**
 * Routeur LLM : chaque tâche déclare une chaîne de fournisseurs gratuits.
 * - un fournisseur sans clé, en circuit ouvert ou à court de budget de temps est sauté ;
 * - la sortie doit être un JSON valide pour le schéma Zod, sinon on passe au suivant ;
 * - si tout échoue, le routeur renvoie `null` : l'appelant bascule sur son repli déterministe.
 * Ce module est pur (dépendances injectées) pour être testé sans réseau.
 */

export type Task = "interview" | "portrait" | "ideation" | "plan" | "assistant";

export const CHAINS: Record<Task, ProviderId[]> = {
  // Latence d'abord : l'utilisateur attend la question suivante.
  interview: ["groq", "cerebras", "gemini", "openrouter"],
  // Qualité rédactionnelle d'abord.
  portrait: ["gemini", "groq", "openrouter"],
  ideation: ["gemini", "openrouter", "groq"],
  plan: ["gemini", "openrouter", "groq"],
  assistant: ["groq", "gemini", "openrouter"],
};

export type UsageRecord = {
  task: Task;
  provider: ProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
  errorCode: string | null;
  latencyMs: number;
  userId: string | null;
};

export type RouterDeps = {
  providers: Record<ProviderId, Provider>;
  call: (provider: Provider, request: ChatRequest, signal: AbortSignal) => Promise<ChatResult>;
  record: (usage: UsageRecord) => Promise<void>;
  now?: () => number;
};

export type GenerateOptions<S extends z.ZodType> = {
  task: Task;
  system: string;
  user: string;
  schema: S;
  /** Budget de temps total pour toute la chaîne. */
  timeoutMs: number;
  temperature?: number;
  maxTokens?: number;
  userId?: string | null;
};

export type Generated<T> = { data: T; provider: ProviderId; model: string };

const FAILURES_BEFORE_OPEN = 3;
const OPEN_FOR_MS = 60_000;
const MIN_ATTEMPT_MS = 1_500;

/** Extrait l'objet JSON d'une réponse, y compris si le modèle l'a entouré de ```json. */
export function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new SyntaxError("Aucun objet JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

export function createRouter(deps: RouterDeps) {
  const now = deps.now ?? Date.now;
  const circuits = new Map<ProviderId, { failures: number; openUntil: number }>();

  const isOpen = (id: ProviderId) => (circuits.get(id)?.openUntil ?? 0) > now();

  function fail(id: ProviderId, retryAfterSeconds: number | null) {
    const state = circuits.get(id) ?? { failures: 0, openUntil: 0 };
    state.failures += 1;
    if (retryAfterSeconds) state.openUntil = now() + retryAfterSeconds * 1000;
    else if (state.failures >= FAILURES_BEFORE_OPEN) state.openUntil = now() + OPEN_FOR_MS;
    circuits.set(id, state);
  }

  const succeed = (id: ProviderId) => circuits.set(id, { failures: 0, openUntil: 0 });

  async function generate<S extends z.ZodType>(options: GenerateOptions<S>): Promise<Generated<z.infer<S>> | null> {
    const deadline = now() + options.timeoutMs;
    const messages: ChatMessage[] = [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ];

    for (const id of CHAINS[options.task]) {
      const provider = deps.providers[id];
      if (!provider.apiKey || isOpen(id)) continue;
      const remaining = deadline - now();
      if (remaining < MIN_ATTEMPT_MS) break;

      const startedAt = now();
      let usage: Pick<UsageRecord, "inputTokens" | "outputTokens"> = { inputTokens: 0, outputTokens: 0 };
      let errorCode: string | null = null;
      let retryAfter: number | null = null;

      try {
        const result = await deps.call(
          provider,
          { messages, temperature: options.temperature ?? 0.6, maxTokens: options.maxTokens ?? 1200 },
          AbortSignal.timeout(remaining),
        );
        usage = { inputTokens: result.inputTokens, outputTokens: result.outputTokens };
        const parsed = options.schema.safeParse(extractJson(result.content));
        if (parsed.success) {
          succeed(id);
          await record({ ...usage, success: true, errorCode: null });
          return { data: parsed.data, provider: id, model: provider.model };
        }
        errorCode = "invalid_output";
      } catch (error) {
        if (error instanceof ProviderError) {
          errorCode = error.status ? `${error.code}_${error.status}` : error.code;
          retryAfter = error.retryAfterSeconds;
        } else if (error instanceof SyntaxError) {
          errorCode = "invalid_json";
        } else if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
          errorCode = "timeout";
        } else {
          errorCode = "network";
        }
      }

      fail(id, retryAfter);
      await record({ ...usage, success: false, errorCode });

      async function record(partial: Omit<UsageRecord, "task" | "provider" | "model" | "latencyMs" | "userId">) {
        try {
          await deps.record({
            ...partial,
            task: options.task,
            provider: id,
            model: provider.model,
            latencyMs: now() - startedAt,
            userId: options.userId ?? null,
          });
        } catch {
          // La traçabilité ne doit jamais casser l'expérience utilisateur.
        }
      }
    }
    return null;
  }

  /** Au moins un fournisseur de la chaîne est configuré. */
  const isAvailable = (task: Task) => CHAINS[task].some((id) => Boolean(deps.providers[id].apiKey));

  return { generate, isAvailable };
}
