import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { decrypt, decryptJson, encrypt, encryptJson } from "@/server/crypto";
import { aiUsage, assistantConversations, assistantMessages, projects } from "@/server/db/schema";
import { withSystem, withUser } from "./context";

/** Conversation avec le coach : une par projet, messages chiffrés. */

export type StoredMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: Date };

const HISTORY_LIMIT = 60;

async function conversationId(userId: string, projectId: string, create: boolean): Promise<string | null> {
  return withUser(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: assistantConversations.id })
      .from(assistantConversations)
      .where(and(eq(assistantConversations.projectId, projectId), eq(assistantConversations.userId, userId)))
      .orderBy(asc(assistantConversations.createdAt))
      .limit(1);
    if (existing || !create) return existing?.id ?? null;
    const [row] = await tx
      .insert(assistantConversations)
      .values({ projectId, userId, title: "Coach" })
      .returning({ id: assistantConversations.id });
    return row.id;
  });
}

/** Les derniers messages, du plus ancien au plus récent. */
export async function listMessages(userId: string, projectId: string): Promise<StoredMessage[]> {
  const id = await conversationId(userId, projectId, false);
  if (!id) return [];
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(assistantMessages)
      .where(and(eq(assistantMessages.conversationId, id), eq(assistantMessages.userId, userId)))
      .orderBy(desc(assistantMessages.createdAt))
      .limit(HISTORY_LIMIT);
    return rows.reverse().map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? "assistant" : "user",
      content: decrypt(m.contentEnc),
      createdAt: m.createdAt,
    }));
  });
}

export async function appendExchange(userId: string, projectId: string, question: string, answer: string) {
  const id = (await conversationId(userId, projectId, true))!;
  return withUser(userId, async (tx) => {
    // Horodatages distincts : l'ordre de lecture ne dépend pas de l'ordre d'insertion.
    const rows = await tx
      .insert(assistantMessages)
      .values([
        { conversationId: id, userId, role: "user", contentEnc: encrypt(question), createdAt: sql`now()` },
        {
          conversationId: id,
          userId,
          role: "assistant",
          contentEnc: encrypt(answer),
          createdAt: sql`now() + interval '1 millisecond'`,
        },
      ])
      .returning({ id: assistantMessages.id, role: assistantMessages.role, createdAt: assistantMessages.createdAt });
    return rows;
  });
}

export function clearConversation(userId: string, projectId: string) {
  return withUser(userId, async (tx) => {
    await tx
      .delete(assistantConversations)
      .where(and(eq(assistantConversations.projectId, projectId), eq(assistantConversations.userId, userId)));
  });
}

// ---------------------------------------------------------------- Mémoire de projet

type Memory = { facts: string[] };

export function getMemory(userId: string, projectId: string): Promise<string[]> {
  return withUser(userId, async (tx) => {
    const [row] = await tx
      .select({ memoryEnc: projects.memoryEnc })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
    return row?.memoryEnc ? (decryptJson<Memory>(row.memoryEnc).facts ?? []) : [];
  });
}

export function setMemory(userId: string, projectId: string, facts: string[]) {
  return withUser(userId, async (tx) => {
    await tx
      .update(projects)
      .set({ memoryEnc: facts.length ? encryptJson({ facts } satisfies Memory) : null })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  });
}

// ---------------------------------------------------------------- Quota

/** Tokens consommés par le coach ce mois-ci (tentatives échouées comprises : elles coûtent aussi). */
export function assistantTokensThisMonth(userId: string): Promise<number> {
  return withSystem("assistant:quota", async (tx) => {
    const [row] = await tx
      .select({ total: sql<number>`coalesce(sum(${aiUsage.inputTokens} + ${aiUsage.outputTokens}), 0)::int` })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, userId),
          eq(aiUsage.feature, "assistant"),
          gte(aiUsage.createdAt, sql`date_trunc('month', now())`),
        ),
      );
    return row?.total ?? 0;
  });
}
