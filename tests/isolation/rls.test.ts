import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { exportUserData, purgeDueDeletions, requestDeletion } from "@/server/dal/account";
import { appendExchange, getMemory, listMessages, setMemory } from "@/server/dal/assistant";
import { withSystem, withUser } from "@/server/dal/context";
import { completeDiagnostic, createDiagnostic, updatePortrait } from "@/server/dal/diagnostics";
import { completeBatch, getIdea, getLatestBatch, selectIdea, startBatch } from "@/server/dal/ideas";
import { getActiveProject, setTaskDone } from "@/server/dal/projects";
import { db } from "@/server/db/client";
import { businessIdeas, deletionRequests, profiles, projects, tasks } from "@/server/db/schema";
import { user } from "@/server/db/schema/auth";
import { fallbackPortrait } from "@/server/diagnostic/engine";
import { OPENING, materialize } from "@/server/diagnostic/fallback";
import { emptyProfile } from "@/server/diagnostic/profile";
import type { GeneratedIdea } from "@/server/ideas/pipeline";

/**
 * Deux personnes, A et B. B essaie tout ce qu'un attaquant pourrait tenter avec l'identifiant
 * d'une ressource de A : la base doit refuser, même sans passer par les filtres de la DAL.
 */

const A = `iso-a-${randomUUID()}`;
const B = `iso-b-${randomUUID()}`;
let ideaId = "";
let projectId = "";
let taskId = "";

const idea = (rank: number): GeneratedIdea => ({
  rank,
  score: 80 - rank,
  breakdown: null,
  candidate: {
    title: `Idée ${rank}`,
    pitch: "Une idée de test assez longue.",
    customer: "Clients",
    offer: "Offre",
    revenueModel: "Vente",
    startCost: "10 000 FCFA",
    family: `famille-${rank}`,
    reach: "local",
    nature: "production",
    whyFit: "Test",
  },
  content: {
    title: `Idée ${rank}`,
    hook: "Accroche",
    summary: "Résumé de l'idée de test.",
    whyYou: "Secret de A : couturière depuis huit ans.",
    offer: { what: "Kit", forWhom: "Mamans", price: "30 000 FCFA", where: "WhatsApp" },
    numbers: { startBudget: "60 000 FCFA", timePerWeek: "12 h", firstGoal: "5 commandes" },
    plan: [1, 2, 3].map((n) => ({ period: `Jours ${n} à ${n + 2}`, title: `Étape ${n}`, story: "Faire.", milestone: "Fait." })),
    todayAction: "Commencer.",
    watchouts: [],
  },
});

async function createUser(id: string) {
  await withSystem("test:isolation", async (tx) => {
    await tx.insert(user).values({ id, name: id, email: `${id}@example.com`, emailVerified: true });
    await tx.insert(profiles).values({ userId: id }).onConflictDoNothing();
  });
}

beforeAll(async () => {
  await createUser(A);
  await createUser(B);
  const state = emptyProfile();
  state.slots.market = { value: { countryCode: "CI", country: "Côte d'Ivoire", city: "Abidjan", scope: "local" }, confidence: 3, source: "user" };
  const owner = { kind: "user" as const, userId: A };
  const diagnosticId = await createDiagnostic(owner, { state, first: { question: materialize(OPENING, "q1", state), source: "fallback" }, promptVersion: "test" });
  await updatePortrait(owner, diagnosticId, state, fallbackPortrait(state));
  await completeDiagnostic(owner, diagnosticId, state);
  const started = await startBatch(A, diagnosticId, 10);
  if (started.kind !== "started") throw new Error(started.kind);
  await completeBatch(A, started.batchId, diagnosticId, [idea(1), idea(2), idea(3)], {
    generators: [], judge: null, writers: [], candidates: 3, eliminated: 0, durationMs: 0,
  });
  const batch = await getLatestBatch(A);
  if (batch.status !== "ready") throw new Error("lot");
  ideaId = batch.ideas[0].id;
  await selectIdea(A, ideaId);
  const project = await getActiveProject(A);
  projectId = project!.id;
  taskId = project!.tasks[0].id;
  await appendExchange(A, projectId, "Question privée de A", "Réponse privée");
  await setMemory(A, projectId, ["Prix fixé par A"]);
});

afterAll(async () => {
  await withSystem("test:isolation", (tx) => tx.delete(user).where(inArray(user.id, [A, B])));
  await db.$client.end();
});

describe("isolation entre comptes", () => {
  it("A voit ses propres données", async () => {
    expect((await getIdea(A, ideaId))?.whyYou).toContain("Secret de A");
    expect((await getActiveProject(A))?.tasks.length).toBe(4);
    expect(await listMessages(A, projectId)).toHaveLength(2);
  });

  it("B ne lit rien de A, même avec les bons identifiants", async () => {
    expect(await getIdea(B, ideaId)).toBeNull();
    expect(await getActiveProject(B)).toBeNull();
    expect(await listMessages(B, projectId)).toEqual([]);
    expect(await getMemory(B, projectId)).toEqual([]);
  });

  it("B ne peut rien modifier chez A", async () => {
    expect(await setTaskDone(B, taskId, true)).toBe(false);
    await setMemory(B, projectId, ["Injecté par B"]);
    expect(await getMemory(A, projectId)).toEqual(["Prix fixé par A"]);
    const [task] = await withSystem("test:isolation", (tx) => tx.select({ status: tasks.status }).from(tasks).where(eq(tasks.id, taskId)));
    expect(task.status).toBe("todo");
  });

  it("la base elle-même refuse, sans les filtres de la DAL (RLS)", async () => {
    const rows = await withUser(B, (tx) => tx.select().from(businessIdeas).where(eq(businessIdeas.id, ideaId)));
    expect(rows).toEqual([]);
    const updated = await withUser(B, (tx) =>
      tx.update(projects).set({ name: "piraté" }).where(eq(projects.id, projectId)).returning({ id: projects.id }),
    );
    expect(updated).toEqual([]);
    await expect(
      withUser(B, (tx) => tx.insert(tasks).values({ projectId, userId: A, title: "Tâche glissée par B" })),
    ).rejects.toThrow();
  });

  it("sans contexte utilisateur, une table privée ne renvoie rien (échec fermé)", async () => {
    const rows = await db.select().from(businessIdeas).where(eq(businessIdeas.id, ideaId));
    expect(rows).toEqual([]);
  });

  it("l'export de B ne contient rien de A", async () => {
    const exported = JSON.stringify(await exportUserData(B));
    expect(exported).not.toContain(ideaId);
    expect(exported).not.toContain("Secret de A");
    expect(exported).not.toContain("Question privée de A");
  });

  it("l'export de A contient ses données en clair", async () => {
    const exported = JSON.stringify(await exportUserData(A));
    expect(exported).toContain("Secret de A");
    expect(exported).toContain("Question privée de A");
    expect(exported).toContain("Prix fixé par A");
  });

  it("une suppression échue efface tout le compte", async () => {
    await requestDeletion(A);
    await withSystem("test:isolation", (tx) =>
      tx.update(deletionRequests).set({ scheduledFor: sql`now() - interval '1 minute'` }).where(eq(deletionRequests.userId, A)),
    );
    expect(await purgeDueDeletions()).toBeGreaterThanOrEqual(1);
    const left = await withSystem("test:isolation", (tx) =>
      tx.select({ id: businessIdeas.id }).from(businessIdeas).where(eq(businessIdeas.userId, A)),
    );
    expect(left).toEqual([]);
    expect(await getActiveProject(A)).toBeNull();
  });
});
