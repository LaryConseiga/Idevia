import type { createRouter } from "@/server/ai/router";
import type { Portrait } from "@/server/diagnostic/engine";
import type { ProfileState } from "@/server/diagnostic/profile";
import { generatorPrompt, judgePrompt, profileBrief, writerPrompt } from "./prompts";
import {
  candidatesSchema,
  CRITERIA,
  ideaContentSchema,
  judgementSchema,
  type Candidate,
  type Criterion,
  type IdeaContent,
  type Judgement,
  type ScoreBreakdown,
} from "./schemas";

/**
 * Orchestration de la génération d'idées (pure : le modèle est injecté).
 *
 * 1. Divergence : deux générateurs de familles différentes proposent chacun 6 idées, sous deux angles
 *    (« ancrage » dans l'existant, « audace »).
 * 2. Jugement : un troisième modèle note chaque candidate sur six critères ; le score est calculé ici,
 *    avec des poids fixes, pour qu'il soit stable et explicable.
 * 3. Sélection : les 3 meilleures, de familles différentes, classées de la plus à la moins pertinente.
 * 4. Rédaction : une fiche et un plan d'action sur 30 jours pour chacune, en parallèle.
 */

type Generate = ReturnType<typeof createRouter>["generate"];

export const IDEAS_PER_GENERATOR = 6;
export const KEEP = 3;

export type GeneratedIdea = {
  rank: number;
  candidate: Candidate;
  score: number | null;
  breakdown: ScoreBreakdown;
  content: IdeaContent;
};

export type PipelineTrace = {
  generators: string[];
  judge: string | null;
  writers: string[];
  candidates: number;
  eliminated: number;
  durationMs: number;
};

export class IdeasPipelineError extends Error {
  constructor(readonly code: "no_candidates" | "writer_failed") {
    super(code);
  }
}

export function weightedScore(j: Pick<Judgement, Criterion>): number {
  let total = 0;
  for (const [key, { weight }] of Object.entries(CRITERIA)) total += j[key as Criterion] * weight;
  return Math.round(total * 10);
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Deux titres quasi identiques venant des deux générateurs. */
function sameIdea(a: Candidate, b: Candidate) {
  const wa = new Set(normalize(a.title).split(" ").filter((w) => w.length > 3));
  const wb = new Set(normalize(b.title).split(" ").filter((w) => w.length > 3));
  if (!wa.size || !wb.size) return false;
  const common = [...wa].filter((w) => wb.has(w)).length;
  return common / Math.min(wa.size, wb.size) >= 0.66;
}

export function dedupe(candidates: Candidate[]): Candidate[] {
  const kept: Candidate[] = [];
  for (const c of candidates) if (!kept.some((k) => sameIdea(k, c))) kept.push(c);
  return kept;
}

/**
 * Garde les meilleures idées, une seule par famille de modèle économique tant que c'est possible.
 * Sans notation (juge indisponible), l'ordre des générateurs fait foi.
 */
export function select(candidates: Candidate[], judgements: Judgement[] | null, keep = KEEP) {
  const scored = candidates.map((candidate, index) => {
    const j = judgements?.find((x) => x.index === index) ?? null;
    return {
      candidate,
      judgement: j,
      score: j ? weightedScore(j) : null,
      family: normalize(j?.family || candidate.family),
      eliminated: j?.eliminate ?? false,
      order: index,
    };
  });

  const ranked = scored
    .filter((s) => !s.eliminated)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.order - b.order);

  const picked: typeof ranked = [];
  for (const s of ranked) {
    if (picked.length === keep) break;
    if (!picked.some((p) => p.family === s.family)) picked.push(s);
  }
  // Pas assez de familles différentes : on complète avec les meilleures restantes.
  for (const s of ranked) {
    if (picked.length === keep) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return { picked, eliminated: scored.length - ranked.length };
}

const breakdownOf = (j: Judgement | null): ScoreBreakdown =>
  j
    ? (Object.fromEntries(Object.keys(CRITERIA).map((k) => [k, Math.round(j[k as Criterion] * 10)])) as Record<Criterion, number>)
    : null;

export async function runIdeasPipeline(input: {
  state: ProfileState;
  portrait: Omit<Portrait, "source"> | null;
  generate: Generate;
  userId: string;
  now?: () => number;
}): Promise<{ ideas: GeneratedIdea[]; trace: PipelineTrace }> {
  const now = input.now ?? Date.now;
  const started = now();
  const brief = profileBrief(input.state, input.portrait);
  const common = { userId: input.userId, schema: candidatesSchema, maxTokens: 2600 };

  // 1. Divergence
  const [anchored, bold] = await Promise.all([
    input.generate({
      task: "ideation",
      ...generatorPrompt({ brief, state: input.state, angle: "ancrage", count: IDEAS_PER_GENERATOR }),
      ...common,
      temperature: 0.8,
      timeoutMs: 45_000,
    }),
    input.generate({
      task: "ideation_alt",
      ...generatorPrompt({ brief, state: input.state, angle: "audace", count: IDEAS_PER_GENERATOR }),
      ...common,
      temperature: 1,
      timeoutMs: 45_000,
    }),
  ]);
  // On alterne les deux sources pour que, sans juge, l'ordre reste équilibré.
  const a = anchored?.data.ideas ?? [];
  const b = bold?.data.ideas ?? [];
  const merged = Array.from({ length: Math.max(a.length, b.length) }, (_, i) => [a[i], b[i]])
    .flat()
    .filter((c): c is Candidate => Boolean(c));
  const candidates = dedupe(merged);
  if (candidates.length < KEEP) throw new IdeasPipelineError("no_candidates");

  // 2. Jugement
  const judged = await input.generate({
    task: "judge",
    ...judgePrompt({ brief, state: input.state, candidates }),
    schema: judgementSchema,
    userId: input.userId,
    temperature: 0.2,
    maxTokens: 2000,
    timeoutMs: 40_000,
  });

  // 3. Sélection
  const { picked, eliminated } = select(candidates, judged?.data.scores ?? null);
  if (picked.length < KEEP) throw new IdeasPipelineError("no_candidates");

  // 4. Rédaction, en parallèle
  const written = await Promise.all(
    picked.map((p, i) =>
      input.generate({
        task: "plan",
        ...writerPrompt({ brief, state: input.state, candidate: p.candidate, judgement: p.judgement, rank: i + 1 }),
        schema: ideaContentSchema,
        userId: input.userId,
        temperature: 0.75,
        maxTokens: 3200,
        timeoutMs: 70_000,
      }),
    ),
  );
  if (written.some((w) => !w)) throw new IdeasPipelineError("writer_failed");

  const ideas = picked.map((p, i) => ({
    rank: i + 1,
    candidate: p.candidate,
    score: p.score,
    breakdown: breakdownOf(p.judgement),
    content: written[i]!.data,
  }));

  return {
    ideas,
    trace: {
      generators: [anchored, bold].filter(Boolean).map((g) => `${g!.provider}:${g!.model}`),
      judge: judged ? `${judged.provider}:${judged.model}` : null,
      writers: written.map((w) => `${w!.provider}:${w!.model}`),
      candidates: candidates.length,
      eliminated,
      durationMs: now() - started,
    },
  };
}
