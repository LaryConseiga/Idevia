import "server-only";
import { and, eq, lte, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { decrypt } from "@/server/crypto";
import {
  assistantConversations,
  assistantMessages,
  businessIdeas,
  businessPlans,
  deletionRequests,
  diagnosticTurns,
  diagnostics,
  fieldChecks,
  ideaBatches,
  profiles,
  projectNotes,
  projects,
  proWaitlist,
  tasks,
  usageCounters,
  validations,
} from "@/server/db/schema";
import { user } from "@/server/db/schema/auth";
import { withSystem, withUser } from "./context";

/** Droits sur les données : export complet (portabilité) et suppression avec délai de grâce. */

/** Toutes les tables privées : chaque ligne porte `user_id`, et la RLS garantit qu'on ne lit que les siennes. */
const PRIVATE_TABLES: Record<string, PgTable & { userId: unknown }> = {
  profil: profiles,
  diagnostics,
  tours_du_diagnostic: diagnosticTurns,
  generations_d_idees: ideaBatches,
  idees: businessIdeas,
  projets: projects,
  taches: tasks,
  hypotheses: validations,
  verifications_terrain: fieldChecks,
  plans: businessPlans,
  notes: projectNotes,
  conversations_coach: assistantConversations,
  messages_coach: assistantMessages,
  quotas: usageCounters,
  liste_d_attente_pro: proWaitlist,
};

/** Colonne chiffrée (`xxxEnc`) → valeur en clair, objet JSON si c'en est un. */
function readable(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!key.endsWith("Enc")) {
      out[key] = value;
      continue;
    }
    const name = key.slice(0, -3);
    if (typeof value !== "string") {
      out[name] = value;
      continue;
    }
    const plain = decrypt(value);
    try {
      out[name] = JSON.parse(plain);
    } catch {
      out[name] = plain;
    }
  }
  return out;
}

export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const [account] = await withSystem("export:account", (tx) =>
    tx
      .select({ id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt })
      .from(user)
      .where(eq(user.id, userId)),
  );
  const data = await withUser(userId, async (tx) => {
    const out: Record<string, unknown[]> = {};
    for (const [name, table] of Object.entries(PRIVATE_TABLES)) {
      const rows = (await tx
        .select()
        .from(table)
        .where(eq(table.userId as never, userId))) as Record<string, unknown>[];
      out[name] = rows.map(readable);
    }
    return out;
  });
  return {
    format: "idevia-export-v1",
    exporte_le: new Date().toISOString(),
    compte: account ?? null,
    ...data,
  };
}

// ---------------------------------------------------------------- Suppression

const GRACE_DAYS = 30;

export function getDeletion(userId: string): Promise<{ scheduledFor: Date } | null> {
  return withUser(userId, async (tx) => {
    const [row] = await tx
      .select({ scheduledFor: deletionRequests.scheduledFor, status: deletionRequests.status })
      .from(deletionRequests)
      .where(eq(deletionRequests.userId, userId));
    return row?.status === "pending" ? { scheduledFor: row.scheduledFor } : null;
  });
}

export function requestDeletion(userId: string): Promise<Date> {
  return withUser(userId, async (tx) => {
    const values = {
      userId,
      status: "pending",
      requestedAt: sql`now()`,
      scheduledFor: sql`now() + make_interval(days => ${GRACE_DAYS})`,
    };
    const [row] = await tx
      .insert(deletionRequests)
      .values(values)
      .onConflictDoUpdate({ target: deletionRequests.userId, set: values })
      .returning({ scheduledFor: deletionRequests.scheduledFor });
    // Plus de rappels pendant le délai de grâce.
    await tx.update(profiles).set({ emailReminders: false }).where(eq(profiles.userId, userId));
    return row.scheduledFor;
  });
}

export function cancelDeletion(userId: string) {
  return withUser(userId, async (tx) => {
    await tx
      .update(deletionRequests)
      .set({ status: "cancelled" })
      .where(and(eq(deletionRequests.userId, userId), eq(deletionRequests.status, "pending")));
  });
}

/**
 * Effacement définitif des comptes dont le délai de grâce est écoulé. La suppression de l'utilisateur
 * entraîne celle de toutes ses données (clés étrangères en cascade) ; les traces de coût IA sont anonymisées.
 */
export function purgeDueDeletions(): Promise<number> {
  return withSystem("account:purge", async (tx) => {
    const due = await tx
      .select({ userId: deletionRequests.userId })
      .from(deletionRequests)
      .where(and(eq(deletionRequests.status, "pending"), lte(deletionRequests.scheduledFor, sql`now()`)));
    for (const { userId } of due) await tx.delete(user).where(eq(user.id, userId));
    return due.length;
  });
}
