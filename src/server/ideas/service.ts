import "server-only";
import { after } from "next/server";
import { ai } from "@/server/ai";
import { getLatestDiagnostic } from "@/server/dal/diagnostics";
import {
  completeBatch,
  countBatchesThisMonth,
  failBatch,
  getIdea,
  getLatestBatch,
  getSelectedIdea,
  selectIdea,
  startBatch,
  type StoredIdea,
} from "@/server/dal/ideas";
import { getPlan } from "@/server/dal/profile";
import { env } from "@/server/env";
import { consume, limits } from "@/server/ratelimit";
import { isLocked } from "./access";
import { IdeasPipelineError, runIdeasPipeline } from "./pipeline";
import { CRITERIA, NATURE_LABELS, REACH_LABELS, type Criterion } from "./schemas";
import type { IdeaCardView, IdeaDetailView, IdeasState } from "./view";

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

function toCard(idea: StoredIdea, locked: boolean): IdeaCardView {
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
        ideas: batch.ideas.map((idea) => toCard(idea, isLocked(idea.rank, plan, env.IDEAS_PAYWALL))),
      };
  }
}

export async function getIdeaDetail(userId: string, ideaId: string): Promise<IdeaDetailView | "locked" | null> {
  const [idea, plan] = await Promise.all([getIdea(userId, ideaId), getPlan(userId)]);
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
      const { ideas, trace } = await runIdeasPipeline({
        state: diagnostic.state,
        portrait: diagnostic.portrait,
        generate: ai.generate,
        userId,
      });
      await completeBatch(userId, started.batchId, diagnostic.id, ideas, trace);
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

export { getSelectedIdea };
