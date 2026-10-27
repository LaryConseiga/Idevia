import type { z } from "zod";
import { ProviderError, type ChatMessage, type ChatRequest, type ChatResult, type Provider, type ProviderId } from "./types";

/**
 * Routeur LLM : chaque tâche déclare une chaîne de fournisseurs gratuits.
 * - un fournisseur sans clé, en circuit ouvert ou à court de budget de temps est sauté ;
 * - la sortie doit être un JSON valide pour le schéma Zod, sinon on passe au suivant ;
 * - si tout échoue, le routeur renvoie `null` : l'appelant bascule sur son repli déterministe.
 * Ce module est pur (dépendances injectées) pour être testé sans réseau.
 */

export type Task = "interview" | "portrait" | "ideation" | "ideation_alt" | "judge" | "plan" | "assistant";

/**
 * Choix mesurés le 27/10/2026 sur de vraies tâches en français (voir docs/ARCHITECTURE.md §2.1).
 * - qwen (Groq) : ~0,5 s, idéal pour l'entretien ;
 * - gpt-oss-120b (Groq) : raisonne bien, ~5 s, ~1 000 requêtes/jour mais tokens/minute limités ;
 * - Gemini 3.5 Flash : la meilleure plume, mais 20 requêtes/jour en gratuit : réservé à ce qui compte le plus ;
 * - Gemini Flash Lite : rapide, quota large, bon filet de sécurité ;
 * - Ministral 8B (Mistral, seul modèle ouvert en gratuit) : idées variées mais ~20 s, JSON valide 3 fois sur 4 et
 *   fiches peu fiables (1 sur 4) : relais pour l'entretien et l'idéation, jamais pour noter ni rédiger ;
 * - OpenRouter gratuit : lent et instable, dernier recours.
 */
export const CHAINS: Record<Task, ProviderId[]> = {
  // Latence d'abord : l'utilisateur attend la question suivante.
  interview: ["groq_fast", "gemini_lite", "groq_reasoning", "mistral", "openrouter"],
  portrait: ["groq_reasoning", "gemini", "gemini_lite"],
  // Idéation à deux voix, deux familles de modèles différentes (Google et Alibaba) pour diversifier.
  ideation: ["gemini_lite", "gemini", "mistral", "openrouter"],
  // qwen garde à gpt-oss-120b son quota de tokens/minute pour le juge qui suit immédiatement.
  ideation_alt: ["groq_fast", "groq_reasoning", "mistral", "openrouter"],
  // Le juge raisonne, et n'est pas le générateur principal (on limite la complaisance envers ses propres idées).
  judge: ["groq_reasoning", "gemini_lite", "openrouter"],
  // Rédaction : voir WRITER_CHAINS (une voie différente par idée).
  plan: ["groq_reasoning", "gemini_lite", "gemini"],
  assistant: ["groq_fast", "gemini_lite", "groq_reasoning", "mistral"],
};

/**
 * Les trois fiches sont rédigées en parallèle sur trois voies différentes : on évite d'épuiser d'un coup
 * le quota d'un seul modèle, et la meilleure plume disponible écrit l'idée n°1.
 */
export const WRITER_CHAINS: ProviderId[][] = [
  ["gemini", "groq_reasoning", "gemini_lite"],
  ["groq_reasoning", "gemini_lite", "gemini"],
  ["gemini_lite", "groq_reasoning", "gemini"],
];

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
  sleep?: (ms: number) => Promise<void>;
};

export type GenerateOptions<S extends z.ZodType> = {
  task: Task;
  system: string;
  user: string;
  schema: S;
  /** Budget de temps total pour toute la chaîne. */
  timeoutMs: number;
  /** Plafond par tentative : un fournisseur lent ne doit pas consommer tout le budget avant le repli. */
  attemptTimeoutMs?: number;
  /** Ordre des voies propre à cet appel (sinon celui de la tâche). */
  chain?: ProviderId[];
  temperature?: number;
  maxTokens?: number;
  userId?: string | null;
};

export type Generated<T> = { data: T; provider: ProviderId; model: string };

const FAILURES_BEFORE_OPEN = 3;
const OPEN_FOR_MS = 60_000;
const MIN_ATTEMPT_MS = 1_500;
/** Au-delà de cette attente, on passe tout de suite à la voie suivante. */
const SHORT_WAIT_S = 8;

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
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
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

    for (const id of options.chain ?? CHAINS[options.task]) {
      const provider = deps.providers[id];
      if (!provider.apiKey || isOpen(id)) continue;

      for (let attempt = 0; attempt < 2; attempt++) {
        const remaining = deadline - now();
        if (remaining < MIN_ATTEMPT_MS) return null;

        const startedAt = now();
        let usage: Pick<UsageRecord, "inputTokens" | "outputTokens"> = { inputTokens: 0, outputTokens: 0 };
        let errorCode: string | null = null;
        let retryAfter: number | null = null;

        const record = async (partial: Omit<UsageRecord, "task" | "provider" | "model" | "latencyMs" | "userId">) => {
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
        };

        try {
          const result = await deps.call(
            provider,
            { messages, temperature: options.temperature ?? 0.6, maxTokens: options.maxTokens ?? 1200 },
            AbortSignal.timeout(Math.min(remaining, options.attemptTimeoutMs ?? remaining)),
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

        await record({ ...usage, success: false, errorCode });

        // Limite de débit levée dans quelques secondes (fréquent chez Groq, limite par minute) :
        // mieux vaut patienter et garder le meilleur modèle que passer à un moins bon.
        const shortWait = retryAfter !== null && retryAfter <= SHORT_WAIT_S;
        if (attempt === 0 && shortWait && deadline - now() > retryAfter! * 1000 + MIN_ATTEMPT_MS) {
          await sleep(retryAfter! * 1000);
          continue;
        }
        fail(id, retryAfter);
        break;
      }
    }
    return null;
  }

  /** Au moins un fournisseur de la chaîne est configuré. */
  const isAvailable = (task: Task) => CHAINS[task].some((id) => Boolean(deps.providers[id].apiKey));

  return { generate, isAvailable };
}
