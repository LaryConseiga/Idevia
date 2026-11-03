import "server-only";
import { after } from "next/server";
import { ai } from "@/server/ai";
import { getLatestDiagnostic } from "@/server/dal/diagnostics";
import {
  applyIdeaChange,
  changesThisMonth,
  clearBatchReaction,
  completeBatch,
  countBatchesThisMonth,
  failBatch,
  getIdea,
  getLatestBatch,
  getReaction,
  getReserve,
  getSelectedIdea,
  saveReaction,
  selectIdea,
  startBatch,
  type StoredIdea,
} from "@/server/dal/ideas";
import { getPlan } from "@/server/dal/profile";
import type { IdeaReactionReason, ReactionView } from "@/lib/idea-reactions";
import { env } from "@/server/env";
import { consume, limits } from "@/server/ratelimit";
import { isLocked } from "./access";
import { ADJUSTABLE, adjustmentFeedback, CHANGE_CHAIN, MAX_CHANGES_PER_IDEA, pickFromReserve, REPLACEABLE } from "./changes";
import { IdeasPipelineError, runIdeasPipeline, type ReserveIdea } from "./pipeline";
import { profileBrief, writerPrompt } from "./prompts";
import { refineIdea } from "./refine";
import { ideaContentSchema } from "./schemas";
import { CRITERIA, NATURE_LABELS, REACH_LABELS, type Criterion } from "./schemas";
import type { ChangeAllowance, IdeaCardView, IdeaDetailView, IdeasState } from "./view";

/** Cas d'usage des idées. L'utilisateur est toujours celui de la session (vérifié par l'appelant). */

const FAILURE_MESSAGES: Record<string, string> = {
  no_candidates: "Les modèles n'ont pas proposé assez d'idées solides cette fois-ci.",
  writer_failed: "La rédaction des plans n'a pas pu aller au bout.",
  timeout: "La génération a pris trop de temps.",
};

async function completedDiagnostic(userId: string) {
  const diagnostic = await getLatestDiagnostic({ kind: "user", userId });
  return diagnostic?.status === "completed" ? diagnostic : null;
}

async function quotaLeft(userId: string) {
  // Le quota est vérifié de façon atomique dans startBatch ; ici il ne sert qu'à l'affichage.
  return Math.max(0, env.IDEAS_MONTHLY_QUOTA - (await countBatchesThisMonth(userId)));
}

function toCard(idea: StoredIdea, locked: boolean, reaction: ReactionView | null): IdeaCardView {
  if (locked) return { locked: true, id: idea.id, rank: idea.rank, score: idea.score };
  return {
    locked: false,
    id: idea.id,
    rank: idea.rank,
    title: idea.title,
    hook: idea.summary,
    score: idea.score,
    numbers: idea.numbers,
    reach: idea.reach ? REACH_LABELS[idea.reach] : null,
    nature: idea.nature ? NATURE_LABELS[idea.nature] : null,
    selected: idea.status === "selected",
    reaction,
    version: idea.changeCount,
    changes: idea.changes,
    canChange: idea.changeCount < MAX_CHANGES_PER_IDEA,
  };
}

export async function getIdeasState(userId: string): Promise<IdeasState> {
  const [diagnostic, batch, plan] = await Promise.all([completedDiagnostic(userId), getLatestBatch(userId), getPlan(userId)]);
  if (!diagnostic && batch.status === "none") return { status: "no_diagnostic" };

  switch (batch.status) {
    case "none":
      return { status: "none", quotaLeft: await quotaLeft(userId) };
    case "running":
      return { status: "running", startedAt: batch.startedAt.toISOString() };
    case "failed":
      return {
        status: "failed",
        quotaLeft: await quotaLeft(userId),
        message: FAILURE_MESSAGES[batch.errorCode ?? ""] ?? "Un souci technique a interrompu la génération.",
      };
    case "ready":
      return {
        status: "ready",
        quotaLeft: await quotaLeft(userId),
        ideas: batch.ideas.map((idea) =>
          toCard(idea, isLocked(idea.rank, plan, env.IDEAS_PAYWALL), batch.reactions.byIdea[idea.id] ?? null),
        ),
        batchReaction: batch.reactions.batch,
        allowance: await changeAllowance(userId, batch.batchId),
      };
  }
}

export async function getIdeaDetail(
  userId: string,
  ideaId: string,
): Promise<(IdeaDetailView & { allowance: ChangeAllowance }) | "locked" | null> {
  const [idea, plan, reaction] = await Promise.all([getIdea(userId, ideaId), getPlan(userId), getReaction(userId, ideaId)]);
  if (!idea?.content) return null;
  if (isLocked(idea.rank, plan, env.IDEAS_PAYWALL)) return "locked";
  return {
    id: idea.id,
    rank: idea.rank,
    score: idea.score,
    breakdown: idea.breakdown
      ? (Object.keys(CRITERIA) as Criterion[]).map((key) => ({
          key,
          label: CRITERIA[key].label,
          value: idea.breakdown![key] ?? 0,
        }))
      : null,
    content: idea.content,
    reach: idea.reach ? REACH_LABELS[idea.reach] : null,
    nature: idea.nature ? NATURE_LABELS[idea.nature] : null,
    selected: idea.status === "selected",
    reaction,
    version: idea.changeCount,
    changes: idea.changes,
    canChange: idea.changeCount < MAX_CHANGES_PER_IDEA,
    allowance: await changeAllowance(userId, idea.batchId),
  };
}

export type RequestResult = { ok: true } | { ok: false; error: string };

/**
 * Lance la génération en arrière-plan (`after`) : la réponse part tout de suite, la page suit l'avancement.
 * Une coupure réseau côté téléphone n'interrompt donc pas le travail.
 */
export async function requestIdeas(userId: string): Promise<RequestResult> {
  const verdict = await consume(`ideas:${userId}`, limits.aiGeneration);
  if (!verdict.allowed) return { ok: false, error: "Tu vas un peu vite. Réessaie dans quelques minutes." };

  const diagnostic = await completedDiagnostic(userId);
  if (!diagnostic) return { ok: false, error: "Termine d'abord ton diagnostic : tes idées en dépendent." };

  const started = await startBatch(userId, diagnostic.id, env.IDEAS_MONTHLY_QUOTA);
  if (started.kind === "already_running") return { ok: true };
  if (started.kind === "quota") {
    return { ok: false, error: "Tu as utilisé toutes tes générations d'idées ce mois-ci. Elles reviennent le mois prochain." };
  }

  after(async () => {
    try {
      const { ideas, reserve, trace } = await runIdeasPipeline({
        state: diagnostic.state,
        portrait: diagnostic.portrait,
        generate: ai.generate,
        userId,
      });
      await completeBatch(userId, started.batchId, diagnostic.id, ideas, reserve, trace);
    } catch (error) {
      const code = error instanceof IdeasPipelineError ? error.code : "internal";
      console.error("[idees] génération échouée :", code, error instanceof Error && code === "internal" ? error.message : "");
      await failBatch(userId, started.batchId, code).catch(() => {});
    }
  });
  return { ok: true };
}

export async function chooseIdea(userId: string, ideaId: string): Promise<RequestResult> {
  const [idea, plan] = await Promise.all([getIdea(userId, ideaId), getPlan(userId)]);
  if (!idea) return { ok: false, error: "Idée introuvable." };
  if (isLocked(idea.rank, plan, env.IDEAS_PAYWALL)) return { ok: false, error: "Cette idée fait partie de l'offre Pro." };
  await selectIdea(userId, ideaId);
  return { ok: true };
}

/** Réaction à une idée visible (jamais une idée verrouillée), ou à tout le lot si `ideaId` est nul. */
export async function reactToIdeas(
  userId: string,
  input: { ideaId: string | null; reason: IdeaReactionReason; comment: string | null },
): Promise<RequestResult> {
  if (input.ideaId) {
    const [idea, plan] = await Promise.all([getIdea(userId, input.ideaId), getPlan(userId)]);
    if (!idea) return { ok: false, error: "Idée introuvable." };
    if (isLocked(idea.rank, plan, env.IDEAS_PAYWALL)) return { ok: false, error: "Cette idée fait partie de l'offre Pro." };
  }
  return (await saveReaction(userId, input)) ? { ok: true } : { ok: false, error: "Idée introuvable." };
}

// ---------------------------------------------------------------- Remplacer ou ajuster une idée avant le choix

const CHANGE_ERRORS = {
  quota: "Tu as déjà beaucoup changé tes idées ce mois-ci. Tu pourras recommencer le mois prochain.",
  limit: "Cette idée a déjà été changée deux fois. Choisis-en une autre, ou demande 3 nouvelles idées plus bas.",
  unavailable: "Cette idée ne peut plus être changée.",
  conflict: "Cette idée de réserve vient d'être utilisée. Réessaie.",
  failed: "Je n'ai pas réussi à rédiger la nouvelle version cette fois-ci. Réessaie dans un instant.",
  empty: "Il n'y a plus d'idée en réserve qui corresponde. Tu peux demander 3 nouvelles idées plus bas.",
} as const;

async function changesLeft(userId: string) {
  return Math.max(0, env.IDEA_CHANGES_MONTHLY_QUOTA - (await changesThisMonth(userId)));
}

/** Ce qu'il reste de possibilités de changement : affiché pour ne proposer que les boutons utiles. */
export async function changeAllowance(userId: string, batchId: string | null) {
  const [left, reserve] = await Promise.all([changesLeft(userId), batchId ? getReserve(userId, batchId) : Promise.resolve([])]);
  return { changesLeft: left, reserveLeft: reserve.length };
}

/** Vérifications communes : diagnostic, idée visible, pas encore choisie, encore modifiable. */
async function changeContext(userId: string, ideaId: string) {
  const verdict = await consume(`idea-change:${userId}`, limits.aiGeneration);
  if (!verdict.allowed) return { ok: false, error: "Tu vas un peu vite. Réessaie dans quelques minutes." } as const;
  const [idea, plan, diagnostic, left] = await Promise.all([
    getIdea(userId, ideaId),
    getPlan(userId),
    completedDiagnostic(userId),
    changesLeft(userId),
  ]);
  if (!idea?.content || !idea.batchId) return { ok: false, error: "Idée introuvable." } as const;
  if (isLocked(idea.rank, plan, env.IDEAS_PAYWALL)) return { ok: false, error: "Cette idée fait partie de l'offre Pro." } as const;
  if (!diagnostic) return { ok: false, error: "Termine d'abord ton diagnostic." } as const;
  if (idea.status === "selected") return { ok: false, error: CHANGE_ERRORS.unavailable } as const;
  if (left === 0) return { ok: false, error: CHANGE_ERRORS.quota } as const;
  if (idea.changeCount >= MAX_CHANGES_PER_IDEA) return { ok: false, error: CHANGE_ERRORS.limit } as const;
  return { ok: true, idea: { ...idea, batchId: idea.batchId, content: idea.content }, diagnostic, left } as const;
}

type Diagnostic = NonNullable<Awaited<ReturnType<typeof completedDiagnostic>>>;

/** Rédige une idée de la réserve à la place d'une autre (un appel, modèles au quota large). */
async function writeFromReserve(userId: string, diagnostic: Diagnostic, pick: ReserveIdea, rank: number) {
  const result = await ai.generate({
    task: "plan",
    chain: CHANGE_CHAIN,
    ...writerPrompt({ brief: profileBrief(diagnostic.state, diagnostic.portrait), state: diagnostic.state, candidate: pick.candidate, judgement: pick.judgement, rank }),
    schema: ideaContentSchema,
    userId,
    temperature: 0.75,
    maxTokens: 4000,
    timeoutMs: 90_000,
    attemptTimeoutMs: 45_000,
  });
  return result?.data ?? null;
}

function outcome(result: Awaited<ReturnType<typeof applyIdeaChange>>): RequestResult {
  return result === "ok" ? { ok: true } : { ok: false, error: CHANGE_ERRORS[result] };
}

/** Une autre idée de la réserve à la place de celle-ci ; d'un autre domaine si c'est le domaine qui est refusé. */
export async function replaceIdea(userId: string, ideaId: string): Promise<RequestResult> {
  const ctx = await changeContext(userId, ideaId);
  if (!ctx.ok) return ctx;
  const { idea, diagnostic } = ctx;
  const [reaction, batch, reserve] = await Promise.all([getReaction(userId, ideaId), getLatestBatch(userId), getReserve(userId, idea.batchId)]);
  if (!reaction || !REPLACEABLE.includes(reaction.reason)) return { ok: false, error: "Dis-moi d'abord ce qui ne te va pas dans cette idée." };
  const others = batch.status === "ready" ? batch.ideas.filter((i) => i.id !== idea.id) : [];
  const [pick] = pickFromReserve(reserve, {
    count: 1,
    avoidNatures: idea.nature ? [idea.nature] : [],
    avoidFamilies: [idea.family, ...others.map((i) => i.family)].filter((f): f is string => Boolean(f)),
    strictNatures: reaction.reason === "domain",
  });
  if (!pick) return { ok: false, error: CHANGE_ERRORS.empty };
  const content = await writeFromReserve(userId, diagnostic, pick, idea.rank);
  if (!content) return { ok: false, error: CHANGE_ERRORS.failed };
  return outcome(
    await applyIdeaChange(userId, {
      ideaId,
      content,
      changes: `Je te la propose à la place de « ${idea.title} », que tu as écartée.`,
      fromReserve: pick,
      monthlyQuota: env.IDEA_CHANGES_MONTHLY_QUOTA,
      maxPerIdea: MAX_CHANGES_PER_IDEA,
    }),
  );
}

/** La même idée, ajustée selon la réaction (budget, compétences, « pas pour moi ») et la précision libre. */
export async function adjustIdea(userId: string, ideaId: string): Promise<RequestResult> {
  const ctx = await changeContext(userId, ideaId);
  if (!ctx.ok) return ctx;
  const { idea, diagnostic } = ctx;
  const reaction = await getReaction(userId, ideaId);
  const feedback = reaction && ADJUSTABLE.includes(reaction.reason) ? adjustmentFeedback(reaction.reason, reaction.comment) : null;
  if (!feedback) return { ok: false, error: "Dis-moi d'abord ce qui ne te va pas dans cette idée." };
  const result = await refineIdea({
    brief: profileBrief(diagnostic.state, diagnostic.portrait),
    state: diagnostic.state,
    idea: idea.content,
    feedback,
    done: [],
    field: null,
    memory: [],
    stage: "choice",
    chain: CHANGE_CHAIN,
    generate: ai.generate,
    userId,
  });
  if (!result) return { ok: false, error: CHANGE_ERRORS.failed };
  return outcome(
    await applyIdeaChange(userId, {
      ideaId,
      content: result.idea,
      changes: result.changes,
      fromReserve: null,
      monthlyQuota: env.IDEA_CHANGES_MONTHLY_QUOTA,
      maxPerIdea: MAX_CHANGES_PER_IDEA,
    }),
  );
}

/**
 * « Aucune de ces idées ne me correspond » : remplace les idées encore modifiables par des idées de la réserve,
 * d'autres familles et, autant que possible, d'autres natures. Une rédaction par idée remplacée, en parallèle.
 */
export async function replaceAllIdeas(userId: string): Promise<RequestResult & { replaced?: number }> {
  const verdict = await consume(`idea-change:${userId}`, limits.aiGeneration);
  if (!verdict.allowed) return { ok: false, error: "Tu vas un peu vite. Réessaie dans quelques minutes." };
  const [batch, plan, diagnostic, left] = await Promise.all([getLatestBatch(userId), getPlan(userId), completedDiagnostic(userId), changesLeft(userId)]);
  if (batch.status !== "ready" || !diagnostic) return { ok: false, error: "Idées introuvables." };
  if (left === 0) return { ok: false, error: CHANGE_ERRORS.quota };

  const targets = batch.ideas
    .filter((i) => i.status !== "selected" && i.changeCount < MAX_CHANGES_PER_IDEA && !isLocked(i.rank, plan, env.IDEAS_PAYWALL))
    .slice(0, left);
  const picks = pickFromReserve(await getReserve(userId, batch.batchId), {
    count: targets.length,
    avoidNatures: batch.ideas.map((i) => i.nature).filter((n): n is NonNullable<typeof n> => Boolean(n)),
    avoidFamilies: batch.ideas.map((i) => i.family).filter((f): f is string => Boolean(f)),
  });
  if (!picks.length) return { ok: false, error: CHANGE_ERRORS.empty };

  // Les moins bien classées partent en premier : la meilleure idée n'est remplacée que s'il reste de quoi le faire.
  const pairs = picks.map((pick, i) => ({ pick, target: targets[targets.length - 1 - i] }));
  const written = await Promise.all(pairs.map(({ pick, target }) => writeFromReserve(userId, diagnostic, pick, target.rank)));
  let replaced = 0;
  for (const [i, { pick, target }] of pairs.entries()) {
    const content = written[i];
    if (!content) continue;
    const result = await applyIdeaChange(userId, {
      ideaId: target.id,
      content,
      changes: `Je te la propose à la place de « ${target.title} ».`,
      fromReserve: pick,
      monthlyQuota: env.IDEA_CHANGES_MONTHLY_QUOTA,
      maxPerIdea: MAX_CHANGES_PER_IDEA,
    });
    if (result === "ok") replaced++;
  }
  if (!replaced) return { ok: false, error: CHANGE_ERRORS.failed };
  await clearBatchReaction(userId, batch.batchId);
  return { ok: true, replaced };
}

export { getSelectedIdea };
