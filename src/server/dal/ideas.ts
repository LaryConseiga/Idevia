import "server-only";
import { and, asc, desc, eq, gte, isNull, ne, sql } from "drizzle-orm";
import { decrypt, encrypt, encryptJson, decryptJson } from "@/server/crypto";
import type { Tx } from "@/server/db/client";
import { businessIdeas, ideaBatches, ideaReactions, projects, usageCounters } from "@/server/db/schema";
import type { GeneratedIdea, PipelineTrace, ReserveIdea } from "@/server/ideas/pipeline";
import type { IdeaContent, Nature, Reach, ScoreBreakdown } from "@/server/ideas/schemas";
import type { IdeaReactionReason, ReactionView } from "@/lib/idea-reactions";
import { withUser } from "./context";
import { activateProjectForIdea } from "./projects";

/** Au-delà, un lot « en cours » est considéré comme interrompu (instance coupée, déploiement…). */
const RUNNING_TIMEOUT_MS = 6 * 60 * 1000;

export type StoredIdea = {
  id: string;
  batchId: string | null;
  rank: number;
  title: string;
  summary: string;
  score: number | null;
  breakdown: ScoreBreakdown;
  whyYou: string;
  content: IdeaContent | null;
  status: (typeof businessIdeas.$inferSelect)["status"];
  numbers: IdeaContent["numbers"] | null;
  reach: Reach | null;
  nature: Nature | null;
  family: string | null;
  /** Remplacements et ajustements déjà faits sur cette idée, et ce qui a changé la dernière fois. */
  changeCount: number;
  changes: string | null;
};

/** Fiche chiffrée : le contenu rédigé, plus la note « ce qui a changé » après un remplacement ou un ajustement. */
type StoredContent = IdeaContent & { changes?: string };

export type BatchState =
  | { status: "none" }
  | { status: "running"; batchId: string; startedAt: Date }
  | { status: "failed"; batchId: string; errorCode: string | null }
  | { status: "ready"; batchId: string; ideas: StoredIdea[]; reactions: StoredReactions };

/** Réactions d'un lot : par identifiant d'idée, et `batch` pour la réaction à tout le lot. */
export type StoredReactions = { byIdea: Record<string, ReactionView>; batch: ReactionView | null };

type Details = {
  score: number | null;
  numbers?: IdeaContent["numbers"];
  reach?: Reach;
  nature?: Nature;
  family?: string;
  changes?: number;
};

function toIdea(row: typeof businessIdeas.$inferSelect): StoredIdea {
  const details = row.details as Details;
  const stored = row.contentEnc ? decryptJson<StoredContent>(row.contentEnc) : null;
  const { changes, ...content } = stored ?? {};
  return {
    id: row.id,
    batchId: row.batchId,
    rank: row.rank,
    title: row.title,
    summary: row.summary,
    score: details.score ?? null,
    breakdown: (row.scoreBreakdown as ScoreBreakdown) ?? null,
    whyYou: decrypt(row.whyYouEnc),
    content: stored ? (content as IdeaContent) : null,
    status: row.status,
    numbers: details.numbers ?? null,
    reach: details.reach ?? null,
    nature: details.nature ?? null,
    family: details.family ?? null,
    changeCount: details.changes ?? 0,
    changes: changes ?? null,
  };
}

const isStale = (createdAt: Date) => Date.now() - createdAt.getTime() > RUNNING_TIMEOUT_MS;

export function getLatestBatch(userId: string): Promise<BatchState> {
  return withUser(userId, async (tx) => {
    const [batch] = await tx
      .select()
      .from(ideaBatches)
      .where(eq(ideaBatches.userId, userId))
      .orderBy(desc(ideaBatches.createdAt))
      .limit(1);
    if (!batch) return { status: "none" };
    if (batch.status === "running") {
      return isStale(batch.createdAt)
        ? { status: "failed", batchId: batch.id, errorCode: "timeout" }
        : { status: "running", batchId: batch.id, startedAt: batch.createdAt };
    }
    if (batch.status === "failed") return { status: "failed", batchId: batch.id, errorCode: batch.errorCode };
    const [rows, reactions] = await Promise.all([
      tx.select().from(businessIdeas).where(eq(businessIdeas.batchId, batch.id)).orderBy(asc(businessIdeas.rank)),
      tx.select().from(ideaReactions).where(eq(ideaReactions.batchId, batch.id)),
    ]);
    const stored: StoredReactions = { byIdea: {}, batch: null };
    for (const r of reactions) {
      const view = { reason: r.reason, comment: r.commentEnc ? decrypt(r.commentEnc) : null };
      if (r.ideaId) stored.byIdea[r.ideaId] = view;
      else stored.batch = view;
    }
    return { status: "ready", batchId: batch.id, ideas: rows.map(toIdea), reactions: stored };
  });
}

export function getIdea(userId: string, ideaId: string): Promise<StoredIdea | null> {
  return withUser(userId, async (tx) => {
    const [row] = await tx
      .select()
      .from(businessIdeas)
      .where(and(eq(businessIdeas.id, ideaId), eq(businessIdeas.userId, userId)))
      .limit(1);
    return row ? toIdea(row) : null;
  });
}

/** Idée choisie par l'utilisateur (la plus récente s'il en a choisi plusieurs au fil du temps). */
export function getSelectedIdea(userId: string): Promise<StoredIdea | null> {
  return withUser(userId, async (tx) => {
    const [row] = await tx
      .select()
      .from(businessIdeas)
      .where(and(eq(businessIdeas.userId, userId), eq(businessIdeas.status, "selected")))
      .orderBy(desc(businessIdeas.createdAt))
      .limit(1);
    return row ? toIdea(row) : null;
  });
}

/** Générations du mois en cours (les échecs ne comptent pas). */
async function batchesThisMonth(tx: Tx, userId: string): Promise<number> {
  const [{ count }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(ideaBatches)
    .where(
      and(
        eq(ideaBatches.userId, userId),
        ne(ideaBatches.status, "failed"),
        gte(ideaBatches.createdAt, sql`date_trunc('month', now())`),
      ),
    );
  return count;
}

export const countBatchesThisMonth = (userId: string) => withUser(userId, (tx) => batchesThisMonth(tx, userId));

export type StartResult = { kind: "started"; batchId: string } | { kind: "already_running" } | { kind: "quota" };

/**
 * Ouvre un lot de génération. Refuse s'il y en a déjà un en cours, ou si le quota du mois est atteint
 * (chaque génération coûte une dizaine d'appels aux modèles, même gratuits).
 */
export function startBatch(userId: string, diagnosticId: string, monthlyQuota: number): Promise<StartResult> {
  return withUser(userId, async (tx) => {
    // Verrou par utilisateur, pour que deux clics simultanés ne lancent pas deux lots.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`ideas:${userId}`}))`);
    const [last] = await tx
      .select({ status: ideaBatches.status, createdAt: ideaBatches.createdAt })
      .from(ideaBatches)
      .where(eq(ideaBatches.userId, userId))
      .orderBy(desc(ideaBatches.createdAt))
      .limit(1);
    if (last?.status === "running" && !isStale(last.createdAt)) return { kind: "already_running" };

    if ((await batchesThisMonth(tx, userId)) >= monthlyQuota) return { kind: "quota" };

    const [batch] = await tx.insert(ideaBatches).values({ userId, diagnosticId }).returning({ id: ideaBatches.id });
    return { kind: "started", batchId: batch.id };
  });
}

export function completeBatch(
  userId: string,
  batchId: string,
  diagnosticId: string,
  ideas: GeneratedIdea[],
  reserve: ReserveIdea[],
  trace: PipelineTrace,
) {
  return withUser(userId, async (tx) => {
    await tx.insert(businessIdeas).values(
      ideas.map((idea) => ({
        userId,
        diagnosticId,
        batchId,
        rank: idea.rank,
        title: idea.content.title,
        summary: idea.content.hook,
        // Données non personnelles, utiles aux listes et aux statistiques.
        details: { score: idea.score, numbers: idea.content.numbers, family: idea.candidate.family, reach: idea.candidate.reach, nature: idea.candidate.nature },
        compatibilityScore: idea.score ?? 0,
        scoreBreakdown: idea.breakdown ?? {},
        whyYouEnc: encrypt(idea.content.whyYou),
        contentEnc: encryptJson(idea.content),
      })),
    );
    await tx
      .update(ideaBatches)
      .set({ status: "ready", completedAt: sql`now()`, pipeline: trace, reserveEnc: reserve.length ? encryptJson(reserve) : null })
      .where(and(eq(ideaBatches.id, batchId), eq(ideaBatches.userId, userId)));
  });
}

export function failBatch(userId: string, batchId: string, errorCode: string) {
  return withUser(userId, async (tx) => {
    await tx
      .update(ideaBatches)
      .set({ status: "failed", errorCode, completedAt: sql`now()` })
      .where(and(eq(ideaBatches.id, batchId), eq(ideaBatches.userId, userId)));
  });
}

export function getReaction(userId: string, ideaId: string): Promise<ReactionView | null> {
  return withUser(userId, async (tx) => {
    const [row] = await tx
      .select({ reason: ideaReactions.reason, commentEnc: ideaReactions.commentEnc })
      .from(ideaReactions)
      .where(and(eq(ideaReactions.ideaId, ideaId), eq(ideaReactions.userId, userId)));
    return row ? { reason: row.reason, comment: row.commentEnc ? decrypt(row.commentEnc) : null } : null;
  });
}

/**
 * Enregistre (ou remplace) la réaction à une idée, ou à tout le dernier lot prêt si `ideaId` est nul.
 * Renvoie false si l'idée ou le lot n'appartient pas à la personne.
 */
export function saveReaction(
  userId: string,
  input: { ideaId: string | null; reason: IdeaReactionReason; comment: string | null },
): Promise<boolean> {
  return withUser(userId, async (tx) => {
    let batchId: string | null;
    if (input.ideaId) {
      const [idea] = await tx
        .select({ batchId: businessIdeas.batchId })
        .from(businessIdeas)
        .where(and(eq(businessIdeas.id, input.ideaId), eq(businessIdeas.userId, userId)));
      batchId = idea?.batchId ?? null;
    } else {
      const [batch] = await tx
        .select({ id: ideaBatches.id })
        .from(ideaBatches)
        .where(and(eq(ideaBatches.userId, userId), eq(ideaBatches.status, "ready")))
        .orderBy(desc(ideaBatches.createdAt))
        .limit(1);
      batchId = batch?.id ?? null;
    }
    if (!batchId) return false;

    const values = { reason: input.reason, commentEnc: input.comment ? encrypt(input.comment) : null };
    await tx
      .insert(ideaReactions)
      .values({ userId, batchId, ideaId: input.ideaId, ...values })
      .onConflictDoUpdate({ target: [ideaReactions.batchId, ideaReactions.ideaId], set: { ...values, updatedAt: sql`now()` } });
    return true;
  });
}

// ---------------------------------------------------------------- Remplacer ou ajuster une idée avant le choix

const CHANGE_FEATURE = "idea_change";
const period = () => new Date().toISOString().slice(0, 7);

/** Idées en réserve du lot : notées mais pas rédigées, de la mieux à la moins bien notée. */
export function getReserve(userId: string, batchId: string): Promise<ReserveIdea[]> {
  return withUser(userId, async (tx) => {
    const [batch] = await tx
      .select({ reserveEnc: ideaBatches.reserveEnc })
      .from(ideaBatches)
      .where(and(eq(ideaBatches.id, batchId), eq(ideaBatches.userId, userId)));
    return batch?.reserveEnc ? decryptJson<ReserveIdea[]>(batch.reserveEnc) : [];
  });
}

/** La réaction « aucune de ces idées » ne vaut plus une fois les idées remplacées. */
export function clearBatchReaction(userId: string, batchId: string) {
  return withUser(userId, async (tx) => {
    await tx.delete(ideaReactions).where(and(eq(ideaReactions.batchId, batchId), eq(ideaReactions.userId, userId), isNull(ideaReactions.ideaId)));
  });
}

export function changesThisMonth(userId: string): Promise<number> {
  return withUser(userId, async (tx) => {
    const [row] = await tx
      .select({ used: usageCounters.used })
      .from(usageCounters)
      .where(and(eq(usageCounters.userId, userId), eq(usageCounters.period, period()), eq(usageCounters.feature, CHANGE_FEATURE)));
    return row?.used ?? 0;
  });
}

export type ChangeOutcome = "ok" | "quota" | "limit" | "unavailable" | "conflict";

/**
 * Remplace le contenu d'une idée (même place dans le classement) après un remplacement ou un ajustement.
 * `fromReserve` : l'idée de la réserve utilisée, retirée de la réserve dans la même transaction.
 * La réaction à l'ancienne version est effacée : la personne réagit à la nouvelle.
 */
export function applyIdeaChange(
  userId: string,
  input: {
    ideaId: string;
    content: IdeaContent;
    changes: string;
    fromReserve: ReserveIdea | null;
    monthlyQuota: number;
    maxPerIdea: number;
  },
): Promise<ChangeOutcome> {
  return withUser(userId, async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`idea-change:${userId}`}))`);
    const [counter] = await tx
      .select({ used: usageCounters.used })
      .from(usageCounters)
      .where(and(eq(usageCounters.userId, userId), eq(usageCounters.period, period()), eq(usageCounters.feature, CHANGE_FEATURE)));
    if ((counter?.used ?? 0) >= input.monthlyQuota) return "quota";

    const [row] = await tx
      .select()
      .from(businessIdeas)
      .where(and(eq(businessIdeas.id, input.ideaId), eq(businessIdeas.userId, userId)));
    if (!row?.batchId || row.status === "selected") return "unavailable";
    // Une idée qui a déjà porté un projet (même archivé) garde son contenu : le projet s'y rattache.
    const [linked] = await tx.select({ id: projects.id }).from(projects).where(eq(projects.selectedIdeaId, row.id)).limit(1);
    if (linked) return "unavailable";
    const details = row.details as Details;
    if ((details.changes ?? 0) >= input.maxPerIdea) return "limit";

    let next: Details = { ...details, numbers: input.content.numbers, changes: (details.changes ?? 0) + 1 };
    let score = row.compatibilityScore;
    let breakdown = row.scoreBreakdown;
    if (input.fromReserve) {
      const [batch] = await tx.select({ reserveEnc: ideaBatches.reserveEnc }).from(ideaBatches).where(eq(ideaBatches.id, row.batchId));
      const reserve = batch?.reserveEnc ? decryptJson<ReserveIdea[]>(batch.reserveEnc) : [];
      const index = reserve.findIndex((r) => r.candidate.title === input.fromReserve!.candidate.title);
      if (index === -1) return "conflict";
      reserve.splice(index, 1);
      await tx
        .update(ideaBatches)
        .set({ reserveEnc: reserve.length ? encryptJson(reserve) : null })
        .where(eq(ideaBatches.id, row.batchId));
      const { candidate } = input.fromReserve;
      next = { ...next, score: input.fromReserve.score, family: candidate.family, reach: candidate.reach, nature: candidate.nature };
      score = input.fromReserve.score ?? 0;
      breakdown = input.fromReserve.breakdown ?? {};
    }

    await tx
      .update(businessIdeas)
      .set({
        title: input.content.title,
        summary: input.content.hook,
        whyYouEnc: encrypt(input.content.whyYou),
        contentEnc: encryptJson({ ...input.content, changes: input.changes } satisfies StoredContent),
        details: next,
        compatibilityScore: score,
        scoreBreakdown: breakdown,
      })
      .where(eq(businessIdeas.id, row.id));
    await tx.delete(ideaReactions).where(and(eq(ideaReactions.ideaId, row.id), eq(ideaReactions.userId, userId)));
    await tx
      .insert(usageCounters)
      .values({ userId, period: period(), feature: CHANGE_FEATURE, used: 1 })
      .onConflictDoUpdate({
        target: [usageCounters.userId, usageCounters.period, usageCounters.feature],
        set: { used: sql`${usageCounters.used} + 1` },
      });
    return "ok";
  });
}

/** L'utilisateur choisit son idée : une seule à la fois, et son projet (plan en tâches) devient le projet actif. */
export function selectIdea(userId: string, ideaId: string): Promise<boolean> {
  return withUser(userId, async (tx) => {
    const [idea] = await tx
      .select({ id: businessIdeas.id })
      .from(businessIdeas)
      .where(and(eq(businessIdeas.id, ideaId), eq(businessIdeas.userId, userId)));
    if (!idea) return false;
    await tx
      .update(businessIdeas)
      .set({ status: "suggested" })
      .where(and(eq(businessIdeas.userId, userId), eq(businessIdeas.status, "selected")));
    await tx.update(businessIdeas).set({ status: "selected" }).where(eq(businessIdeas.id, ideaId));
    await activateProjectForIdea(tx, userId, ideaId);
    return true;
  });
}
