import "server-only";
import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import { decryptJson, encryptJson } from "@/server/crypto";
import type { Tx } from "@/server/db/client";
import { businessIdeas, fieldChecks, projectMarketSignals, projects, tasks, validations } from "@/server/db/schema";
import type { IdeaContent } from "@/server/ideas/schemas";
import type { CollectedSignal, FieldCheckResult, FieldReport } from "@/server/market/field-check";
import { tasksFromIdea } from "@/server/projects/tasks";
import { withUser } from "./context";

/** Au-delà, une vérification « en cours » est considérée comme interrompue. */
const RUNNING_TIMEOUT_MS = 6 * 60 * 1000;

export type StoredTask = {
  id: string;
  title: string;
  period: string | null;
  description: string | null;
  expectedResult: string | null;
  dueDate: string | null;
  status: (typeof tasks.$inferSelect)["status"];
  sortOrder: number;
};

export type HypothesisStatus = "untested" | "testing" | "confirmed" | "invalidated";

export type StoredHypothesis = {
  id: string;
  hypothesis: string;
  test: string | null;
  success: string | null;
  status: HypothesisStatus;
};

/** Ce qui est conservé (chiffré) d'une vérification : le rapport et les signaux qui l'appuient. */
export type StoredFieldReport = {
  report: FieldReport;
  queries: FieldCheckResult["queries"];
  signals: Omit<CollectedSignal, "id">[];
};

export type FieldCheckState =
  | { status: "none" }
  | { status: "running"; id: string; startedAt: Date }
  | { status: "failed"; id: string; errorCode: string | null }
  | { status: "ready"; id: string; completedAt: Date; data: StoredFieldReport };

export type StoredProject = {
  id: string;
  name: string;
  ideaId: string | null;
  createdAt: Date;
  tasks: StoredTask[];
  check: FieldCheckState;
  hypotheses: StoredHypothesis[];
};

const isStale = (createdAt: Date) => Date.now() - createdAt.getTime() > RUNNING_TIMEOUT_MS;

/**
 * Projet de l'idée choisie : réactivé s'il existe déjà (les tâches cochées sont conservées),
 * sinon créé avec les tâches du plan. Les autres projets de la personne sont archivés.
 */
export async function activateProjectForIdea(tx: Tx, userId: string, ideaId: string, now = new Date()): Promise<string | null> {
  const [idea] = await tx
    .select({ title: businessIdeas.title, contentEnc: businessIdeas.contentEnc })
    .from(businessIdeas)
    .where(and(eq(businessIdeas.id, ideaId), eq(businessIdeas.userId, userId)));
  if (!idea?.contentEnc) return null;

  await tx
    .update(projects)
    .set({ status: "archived" })
    .where(and(eq(projects.userId, userId), eq(projects.status, "active"), ne(projects.selectedIdeaId, ideaId)));

  const [existing] = await tx
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.selectedIdeaId, ideaId)))
    .orderBy(desc(projects.createdAt))
    .limit(1);
  if (existing) {
    await tx.update(projects).set({ status: "active" }).where(eq(projects.id, existing.id));
    return existing.id;
  }

  const content = decryptJson<IdeaContent>(idea.contentEnc);
  const [project] = await tx
    .insert(projects)
    .values({ userId, selectedIdeaId: ideaId, name: idea.title })
    .returning({ id: projects.id });
  await tx.insert(tasks).values(tasksFromIdea(content, now).map((t) => ({ ...t, projectId: project.id, userId })));
  return project.id;
}

export function getActiveProject(userId: string): Promise<StoredProject | null> {
  return withUser(userId, async (tx) => {
    const [project] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.status, "active")))
      .limit(1);
    if (!project) return null;

    const [taskRows, [check]] = await Promise.all([
      tx.select().from(tasks).where(eq(tasks.projectId, project.id)).orderBy(asc(tasks.sortOrder), asc(tasks.createdAt)),
      tx.select().from(fieldChecks).where(eq(fieldChecks.projectId, project.id)).orderBy(desc(fieldChecks.createdAt)).limit(1),
    ]);

    let state: FieldCheckState = { status: "none" };
    let hypotheses: StoredHypothesis[] = [];
    if (check?.status === "running") {
      state = isStale(check.createdAt)
        ? { status: "failed", id: check.id, errorCode: "timeout" }
        : { status: "running", id: check.id, startedAt: check.createdAt };
    } else if (check?.status === "failed") {
      state = { status: "failed", id: check.id, errorCode: check.errorCode };
    } else if (check?.status === "ready" && check.reportEnc) {
      state = {
        status: "ready",
        id: check.id,
        completedAt: check.completedAt ?? check.createdAt,
        data: decryptJson<StoredFieldReport>(check.reportEnc),
      };
      const rows = await tx
        .select()
        .from(validations)
        .where(eq(validations.fieldCheckId, check.id))
        .orderBy(asc(validations.createdAt));
      // Insérées dans la même requête, elles ont le même horodatage : on suit l'ordre du rapport.
      const order = state.data.report.hypotheses.map((h) => h.hypothesis);
      rows.sort((a, b) => order.indexOf(a.hypothesis) - order.indexOf(b.hypothesis));
      hypotheses = rows.map((v) => ({
        id: v.id,
        hypothesis: v.hypothesis,
        test: v.testDescription,
        success: v.successCriteria,
        status: v.status as HypothesisStatus,
      }));
    }

    return {
      id: project.id,
      name: project.name,
      ideaId: project.selectedIdeaId,
      createdAt: project.createdAt,
      tasks: taskRows.map((t) => ({
        id: t.id,
        title: t.title,
        period: t.period,
        description: t.description,
        expectedResult: t.expectedResult,
        dueDate: t.dueDate,
        status: t.status,
        sortOrder: t.sortOrder,
      })),
      check: state,
      hypotheses,
    };
  });
}

export function setTaskDone(userId: string, taskId: string, done: boolean): Promise<boolean> {
  return withUser(userId, async (tx) => {
    const updated = await tx
      .update(tasks)
      .set(done ? { status: "done", completedAt: sql`now()` } : { status: "todo", completedAt: null })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning({ id: tasks.id });
    return updated.length > 0;
  });
}

export function setHypothesisStatus(userId: string, id: string, status: HypothesisStatus): Promise<boolean> {
  return withUser(userId, async (tx) => {
    const updated = await tx
      .update(validations)
      .set({ status })
      .where(and(eq(validations.id, id), eq(validations.userId, userId)))
      .returning({ id: validations.id });
    return updated.length > 0;
  });
}

async function checksThisMonth(tx: Tx, userId: string): Promise<number> {
  const [{ count }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(fieldChecks)
    .where(
      and(
        eq(fieldChecks.userId, userId),
        ne(fieldChecks.status, "failed"),
        gte(fieldChecks.createdAt, sql`date_trunc('month', now())`),
      ),
    );
  return count;
}

export const countChecksThisMonth = (userId: string) => withUser(userId, (tx) => checksThisMonth(tx, userId));

export type StartCheckResult = { kind: "started"; checkId: string } | { kind: "already_running" } | { kind: "quota" };

export function startFieldCheck(userId: string, projectId: string, monthlyQuota: number): Promise<StartCheckResult> {
  return withUser(userId, async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`field:${userId}`}))`);
    const [last] = await tx
      .select({ status: fieldChecks.status, createdAt: fieldChecks.createdAt })
      .from(fieldChecks)
      .where(eq(fieldChecks.userId, userId))
      .orderBy(desc(fieldChecks.createdAt))
      .limit(1);
    if (last?.status === "running" && !isStale(last.createdAt)) return { kind: "already_running" };
    if ((await checksThisMonth(tx, userId)) >= monthlyQuota) return { kind: "quota" };
    const [check] = await tx.insert(fieldChecks).values({ projectId, userId }).returning({ id: fieldChecks.id });
    return { kind: "started", checkId: check.id };
  });
}

export function completeFieldCheck(userId: string, checkId: string, projectId: string, result: FieldCheckResult) {
  return withUser(userId, async (tx) => {
    const stored: StoredFieldReport = {
      report: result.report,
      queries: result.queries,
      // L'identifiant du cache ne sert qu'au rattachement (project_market_signals), pas à l'affichage.
      signals: result.signals.map((s) => ({
        kind: s.kind,
        query: s.query,
        sourceUrl: s.sourceUrl,
        limits: s.limits,
        collectedAt: s.collectedAt,
        cached: s.cached,
        payload: s.payload,
      })),
    };
    await tx
      .update(fieldChecks)
      .set({ status: "ready", reportEnc: encryptJson(stored), trace: result.trace, completedAt: sql`now()` })
      .where(and(eq(fieldChecks.id, checkId), eq(fieldChecks.userId, userId)));
    await tx.insert(validations).values(
      result.report.hypotheses.map((h) => ({
        projectId,
        userId,
        fieldCheckId: checkId,
        hypothesis: h.hypothesis,
        testDescription: h.test,
        successCriteria: h.success,
      })),
    );
    await tx
      .insert(projectMarketSignals)
      .values(result.signals.map((s) => ({ projectId, signalId: s.id, userId })))
      .onConflictDoNothing();
  });
}

export function failFieldCheck(userId: string, checkId: string, errorCode: string) {
  return withUser(userId, async (tx) => {
    await tx
      .update(fieldChecks)
      .set({ status: "failed", errorCode, completedAt: sql`now()` })
      .where(and(eq(fieldChecks.id, checkId), eq(fieldChecks.userId, userId)));
  });
}

