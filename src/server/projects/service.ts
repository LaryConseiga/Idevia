import "server-only";
import { after } from "next/server";
import { ai } from "@/server/ai";
import { getLatestDiagnostic } from "@/server/dal/diagnostics";
import { getIdea } from "@/server/dal/ideas";
import { getPlan } from "@/server/dal/profile";
import {
  completeFieldCheck,
  countChecksThisMonth,
  failFieldCheck,
  getActiveProject,
  setHypothesisStatus,
  setTaskDone,
  startFieldCheck,
  type HypothesisStatus,
  type StoredProject,
} from "@/server/dal/projects";
import { env } from "@/server/env";
import { consume, limits } from "@/server/ratelimit";
import { apifyConfigured, budgetAvailable } from "@/server/market/apify";
import { collectSignal } from "@/server/market/collect";
import { FieldCheckError, LABELS, runFieldCheck } from "@/server/market/field-check";
import type { FieldView, ProjectView, SourceView } from "./view";

/** Cas d'usage du projet. L'utilisateur est toujours celui de la session (vérifié par l'appelant). */

const FAILURE_MESSAGES: Record<string, string> = {
  no_location: "Il manque ton pays dans ton profil : refais le diagnostic pour qu'on sache où chercher.",
  no_signals: "Les sources n'ont rien renvoyé cette fois-ci. Réessaie un peu plus tard.",
  report_failed: "La lecture des résultats n'a pas pu aller au bout.",
  budget: "Les vérifications terrain sont en pause pour ce mois-ci. Elles reviennent le mois prochain.",
  timeout: "La vérification a pris trop de temps.",
};

export type ActionResult = { ok: true } | { ok: false; error: string };

const isLockedFor = (plan: "free" | "pro") => env.IDEAS_PAYWALL === "on" && plan !== "pro";

async function quotaLeft(userId: string) {
  return Math.max(0, env.FIELD_CHECKS_MONTHLY_QUOTA - (await countChecksThisMonth(userId)));
}

async function fieldView(userId: string, project: StoredProject): Promise<FieldView> {
  const check = project.check;
  switch (check.status) {
    case "none":
      return apifyConfigured() ? { status: "none", quotaLeft: await quotaLeft(userId) } : { status: "unavailable" };
    case "running":
      return { status: "running", startedAt: check.startedAt.toISOString() };
    case "failed":
      return {
        status: "failed",
        message: FAILURE_MESSAGES[check.errorCode ?? ""] ?? "Un souci technique a interrompu la vérification.",
        quotaLeft: await quotaLeft(userId),
      };
    case "ready":
      return {
        status: "ready",
        completedAt: check.completedAt.toISOString(),
        report: check.data.report,
        sources: check.data.signals.map(
          (s, i) =>
            ({
              n: i + 1,
              label: LABELS[s.kind],
              kind: s.kind,
              query: s.query,
              url: s.sourceUrl,
              collectedAt: s.collectedAt,
              limits: s.limits,
              payload: s.payload,
            }) as SourceView,
        ),
        hypotheses: project.hypotheses,
        quotaLeft: await quotaLeft(userId),
      };
  }
}

export async function getProjectView(userId: string): Promise<ProjectView | null> {
  const [project, plan] = await Promise.all([getActiveProject(userId), getPlan(userId)]);
  if (!project) return null;
  const tasks = project.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    period: t.period,
    description: t.description,
    expectedResult: t.expectedResult,
    dueDate: t.dueDate,
    done: t.status === "done",
  }));
  return {
    id: project.id,
    name: project.name,
    ideaId: project.ideaId,
    locked: isLockedFor(plan),
    tasks,
    progress: { done: tasks.filter((t) => t.done).length, total: tasks.length },
    nextTaskId: tasks.find((t) => !t.done)?.id ?? null,
    field: await fieldView(userId, project),
  };
}

export async function toggleTask(userId: string, taskId: string, done: boolean): Promise<ActionResult> {
  if (isLockedFor(await getPlan(userId))) return { ok: false, error: "Le suivi fait partie de l'offre Pro." };
  return (await setTaskDone(userId, taskId, done)) ? { ok: true } : { ok: false, error: "Tâche introuvable." };
}

export async function updateHypothesis(userId: string, id: string, status: HypothesisStatus): Promise<ActionResult> {
  if (isLockedFor(await getPlan(userId))) return { ok: false, error: "Le suivi fait partie de l'offre Pro." };
  return (await setHypothesisStatus(userId, id, status)) ? { ok: true } : { ok: false, error: "Hypothèse introuvable." };
}

/**
 * Lance la vérification terrain en arrière-plan (`after`) : 1 à 2 minutes de collecte, puis la lecture par un modèle.
 */
export async function requestFieldCheck(userId: string): Promise<ActionResult> {
  const verdict = await consume(`field:${userId}`, limits.aiGeneration);
  if (!verdict.allowed) return { ok: false, error: "Tu vas un peu vite. Réessaie dans quelques minutes." };
  if (!apifyConfigured()) return { ok: false, error: "La vérification terrain n'est pas encore disponible." };

  const [project, plan, diagnostic] = await Promise.all([
    getActiveProject(userId),
    getPlan(userId),
    getLatestDiagnostic({ kind: "user", userId }),
  ]);
  if (isLockedFor(plan)) return { ok: false, error: "La vérification terrain fait partie de l'offre Pro." };
  if (!project?.ideaId) return { ok: false, error: "Choisis d'abord ton idée." };
  if (!diagnostic) return { ok: false, error: "Termine d'abord ton diagnostic." };
  const idea = await getIdea(userId, project.ideaId);
  if (!idea?.content) return { ok: false, error: "Idée introuvable." };

  // Crédits du mois presque épuisés : on prévient avant de consommer le quota de la personne.
  if (!(await budgetAvailable())) return { ok: false, error: FAILURE_MESSAGES.budget };

  const started = await startFieldCheck(userId, project.id, env.FIELD_CHECKS_MONTHLY_QUOTA);
  if (started.kind === "already_running") return { ok: true };
  if (started.kind === "quota") {
    return { ok: false, error: "Tu as utilisé tes vérifications terrain de ce mois-ci. Elles reviennent le mois prochain." };
  }

  const content = idea.content;
  after(async () => {
    try {
      const result = await runFieldCheck({
        idea: { title: content.title, summary: content.summary, offer: content.offer, reach: idea.reach },
        state: diagnostic.state,
        generate: ai.generate,
        collect: collectSignal,
        userId,
      });
      await completeFieldCheck(userId, started.checkId, project.id, result);
    } catch (error) {
      const code = error instanceof FieldCheckError ? error.code : "internal";
      console.error("[terrain] vérification échouée :", code, error instanceof Error && code === "internal" ? error.message : "");
      await failFieldCheck(userId, started.checkId, code).catch(() => {});
    }
  });
  return { ok: true };
}
