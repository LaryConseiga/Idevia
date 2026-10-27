import { z } from "zod";
import type { createRouter } from "@/server/ai/router";
import { countryByCode, inCountry } from "@/lib/countries";
import { fallbackByKey, materialize, OPENING, pickFallback } from "./fallback";
import {
  addInsights,
  applyUpdates,
  DIMENSION_LABELS,
  requiredSatisfied,
  slotUpdatesSchema,
  type ProfileState,
} from "./profile";
import { interviewPrompt, portraitPrompt, type HistoryItem } from "./prompts";
import { normalizeQuestion, rawQuestionSchema, type Answer, type Question } from "./question";

/**
 * Moteur de l'entretien adaptatif (docs/ARCHITECTURE.md §4.2). Pur : la persistance est dans la DAL,
 * le modèle est injecté. Un seul appel au modèle par tour (analyse + question suivante) pour limiter la latence.
 */

export const MIN_TURNS = 8;
export const MAX_TURNS = 18;
const INTERVIEW_TIMEOUT_MS = 8_000;
const PORTRAIT_TIMEOUT_MS = 25_000;

type Generate = ReturnType<typeof createRouter>["generate"];

const FALLBACK_PREFIX = "fb:";
const fallbackKeyOf = (q: Question) => (q.id.startsWith(FALLBACK_PREFIX) ? q.id.slice(FALLBACK_PREFIX.length) : null);

export type NextQuestion = { question: Question; source: "llm" | "fallback" };

export function openingQuestion(state: ProfileState): NextQuestion {
  return { question: materialize(OPENING, `${FALLBACK_PREFIX}${OPENING.key}`, state), source: "fallback" };
}

const turnOutputSchema = z.object({
  updates: slotUpdatesSchema.catch({}),
  insights: z.array(z.string()).catch([]).default([]),
  contradictions: z.array(z.string().max(200)).catch([]).default([]),
  next: rawQuestionSchema.nullish().catch(null),
  done: z.boolean().catch(false).default(false),
});

export type TurnInput = {
  state: ProfileState;
  /** Tours déjà répondus, y compris celui qui vient de l'être (le dernier). */
  history: HistoryItem[];
  lastAnswer: Answer;
  generate: Generate;
  userId?: string | null;
};

export type TurnResult = { state: ProfileState; next: NextQuestion | null; usedModel: boolean };

export async function nextTurn({ state, history, lastAnswer, generate, userId }: TurnInput): Promise<TurnResult> {
  const last = history.at(-1);
  if (!last) throw new Error("nextTurn: historique vide");
  const answered = history.length;

  // 1. Une question de la banque sait mettre à jour le profil sans modèle.
  const lastKey = fallbackKeyOf(last.question);
  const entry = lastKey ? fallbackByKey(lastKey) : null;
  let current = entry ? applyUpdates(state, entry.apply(lastAnswer, state, last.question)) : state;

  // 2. Analyse et question suivante par le modèle.
  const prompt = interviewPrompt({ state: current, history, answered, minTurns: MIN_TURNS, maxTurns: MAX_TURNS });
  const result = await generate({
    task: "interview",
    ...prompt,
    schema: turnOutputSchema,
    timeoutMs: INTERVIEW_TIMEOUT_MS,
    temperature: 0.7,
    maxTokens: 1400,
    userId,
  });

  let llmQuestion: Question | null = null;
  if (result) {
    const out = result.data;
    current = applyUpdates(current, out.updates);
    current = addInsights(current, out.insights);
    current = { ...current, contradictions: out.contradictions.slice(0, 3), pending: [] };
    if (out.next) {
      const candidate = normalizeQuestion(out.next, `q${answered + 1}`);
      const repeated = candidate && history.some((h) => similar(h.question.prompt, candidate.prompt));
      llmQuestion = candidate && !repeated ? candidate : null;
    }
  } else if (!entry) {
    // Le modèle n'a pas pu analyser une réponse libre : on la garde pour le prochain tour qui aboutira.
    current = {
      ...current,
      pending: [...current.pending, { question: last.question.prompt, answer: last.answer, intent: last.question.intent }].slice(-6),
    };
  }

  // 3. Garde-fous serveur : bornes et critère d'arrêt ne dépendent pas du modèle.
  const enough = answered >= MIN_TURNS && requiredSatisfied(current) && current.contradictions.length === 0;
  if (answered >= MAX_TURNS || enough) return { state: current, next: null, usedModel: Boolean(result) };

  if (llmQuestion) return { state: current, next: { question: llmQuestion, source: "llm" }, usedModel: true };

  const asked = history.map((h) => fallbackKeyOf(h.question)).filter((k): k is string => Boolean(k));
  const fallback = pickFallback(current, asked);
  if (!fallback) return { state: current, next: null, usedModel: Boolean(result) };
  return {
    state: current,
    next: { question: materialize(fallback, `${FALLBACK_PREFIX}${fallback.key}`, current), source: "fallback" },
    usedModel: Boolean(result),
  };
}

/** Deux questions quasi identiques (le modèle se répète parfois). */
function similar(a: string, b: string) {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3),
    );
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return false;
  const common = [...wa].filter((w) => wb.has(w)).length;
  return common / Math.min(wa.size, wb.size) >= 0.8;
}

// ---------------------------------------------------------------- Portrait (« miroir »)

const items = (min: number, max: number) =>
  z
    .array(z.string().trim().min(2))
    .transform((a) => a.map((s) => s.slice(0, 200)).slice(0, max))
    .refine((a) => a.length >= min);

export const portraitSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(5)
    .transform((s) => s.slice(0, 160)),
  summary: z
    .string()
    .trim()
    .min(40)
    .transform((s) => s.slice(0, 1400)),
  strengths: items(1, 5),
  drivers: items(1, 4),
  watchouts: items(0, 4).catch([]),
  directions: items(1, 4),
});

export type Portrait = z.infer<typeof portraitSchema> & { source: "llm" | "fallback" };

export async function buildPortrait(input: {
  state: ProfileState;
  history: HistoryItem[];
  generate: Generate;
  userId?: string | null;
}): Promise<Portrait> {
  const result = await input.generate({
    task: "portrait",
    ...portraitPrompt(input),
    schema: portraitSchema,
    timeoutMs: PORTRAIT_TIMEOUT_MS,
    temperature: 0.8,
    maxTokens: 1500,
    userId: input.userId,
  });
  return result ? { ...result.data, source: "llm" } : fallbackPortrait(input.state);
}

function factualSummary(state: ProfileState): string {
  const s = state.slots;
  const join = (items: string[]) => items.map((i) => i.toLowerCase()).join(", ");
  const parts = [
    s.skills?.value.items.length ? `Tu peux t'appuyer sur ce que tu sais déjà faire : ${join(s.skills.value.items)}.` : null,
    s.interests?.value.sectors.length ? `Ce qui t'attire : ${join(s.interests.value.sectors)}.` : null,
    s.preferences?.value.channel ? `Pour vendre, tu te vois plutôt : ${s.preferences.value.channel.toLowerCase()}.` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "Tu veux avancer pas à pas, avec un projet à ta mesure.";
}

/** Portrait sans modèle : factuel, construit à partir des réponses structurées. */
export function fallbackPortrait(state: ProfileState): Portrait {
  const s = state.slots;
  const countryName = countryByCode(s.market?.value.countryCode)?.name ?? s.market?.value.country;
  const place = s.market?.value.city ? `à ${s.market.value.city}` : countryName ? inCountry(countryName) : null;
  const goal = {
    complement: "un complément de revenu",
    principal: "ton activité principale",
    scale: "une entreprise qui grandit",
    unsure: "un projet dont tu définis encore l'ampleur",
  }[s.goal?.value.type ?? "unsure"];

  const strengths = [...(s.skills?.value.items ?? []), ...(s.resources?.value.assets ?? [])].slice(0, 5);
  const drivers = [...(s.motivations?.value.values ?? [])].slice(0, 4);
  const watchouts = [
    ...(s.constraints?.value.items ?? []),
    ...(s.resources?.value.budgetRange ? [`Budget de départ : ${s.resources.value.budgetRange}`] : []),
    ...(s.resources?.value.hoursPerWeek ? [`Environ ${s.resources.value.hoursPerWeek} h par semaine`] : []),
  ].slice(0, 4);
  const directions = (s.interests?.value.sectors ?? []).slice(0, 4);

  const why = s.motivations?.value.why;
  return {
    headline: `Tu veux construire ${goal}${place ? ` ${place}` : ""}.`,
    summary: [
      why ? `Ce qui te pousse, avec tes mots : « ${why} »` : "Tu as envie de te lancer et tu veux le faire de façon réfléchie.",
      state.insights.length ? state.insights.slice(0, 3).join(" ") : factualSummary(state),
      ...(state.corrections.length ? [`Tu as tenu à préciser : « ${state.corrections.join(" » ; « ")} »`] : []),
    ].join("\n\n"),
    strengths: strengths.length ? strengths : ["Ta motivation à te lancer"],
    drivers: drivers.length ? drivers : ["Créer quelque chose à toi"],
    watchouts,
    directions: directions.length ? directions : [DIMENSION_LABELS.interests + " : à préciser ensemble"],
    source: "fallback",
  };
}
