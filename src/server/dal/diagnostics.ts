import "server-only";
import { and, asc, desc, eq, inArray, isNull, lt, notInArray, sql } from "drizzle-orm";
import { decryptJson, encryptJson } from "@/server/crypto";
import { countryByCode } from "@/lib/countries";
import type { Tx } from "@/server/db/client";
import { diagnostics, diagnosticTurns, profiles } from "@/server/db/schema";
import type { Portrait } from "@/server/diagnostic/engine";
import type { ProfileState } from "@/server/diagnostic/profile";
import type { Answer, Question } from "@/server/diagnostic/question";
import { withSystem, withUser } from "./context";

/**
 * Persistance du diagnostic. Deux propriétaires possibles :
 * - un utilisateur connecté : contexte RLS utilisateur, la base filtre d'elle-même ;
 * - un visiteur anonyme : contexte système, et CHAQUE requête filtre explicitement sur le hachage
 *   de son identifiant de session et `user_id IS NULL`.
 * Questions, réponses, profil et portrait sont chiffrés.
 */

export type Owner = { kind: "user"; userId: string } | { kind: "anon"; sessionHash: string };

const ANON_TTL_DAYS = 7;

function scoped<T>(owner: Owner, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return owner.kind === "user" ? withUser(owner.userId, fn) : withSystem("diagnostic-anonyme", fn);
}

/** Condition d'appartenance, ajoutée à chaque requête (redondante avec RLS pour un utilisateur). */
const owns = (owner: Owner) =>
  owner.kind === "user"
    ? eq(diagnostics.userId, owner.userId)
    : and(eq(diagnostics.anonSessionHash, owner.sessionHash), isNull(diagnostics.userId));

export type StoredTurn = { turn: number; question: Question; answer: { answer: Answer; text: string } | null; source: string };

export type StoredDiagnostic = {
  id: string;
  status: (typeof diagnostics.$inferSelect)["status"];
  answered: number;
  state: ProfileState;
  portrait: Portrait | null;
  turns: StoredTurn[];
};

async function readTurns(tx: Tx, diagnosticId: string): Promise<StoredTurn[]> {
  const rows = await tx
    .select()
    .from(diagnosticTurns)
    .where(eq(diagnosticTurns.diagnosticId, diagnosticId))
    .orderBy(asc(diagnosticTurns.turn));
  return rows.map((r) => ({
    turn: r.turn,
    question: decryptJson<Question>(r.questionEnc),
    answer: r.answerEnc ? decryptJson<{ answer: Answer; text: string }>(r.answerEnc) : null,
    source: r.source,
  }));
}

/** Diagnostic le plus récent encore utile (en cours, portrait prêt ou terminé). */
export function getLatestDiagnostic(owner: Owner): Promise<StoredDiagnostic | null> {
  return scoped(owner, async (tx) => {
    const [row] = await tx
      .select()
      .from(diagnostics)
      .where(and(owns(owner), inArray(diagnostics.status, ["in_progress", "portrait_ready", "completed"])))
      .orderBy(desc(diagnostics.createdAt))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      answered: row.turnCount,
      state: decryptJson<ProfileState>(row.stateEnc),
      portrait: row.portraitEnc ? decryptJson<Portrait>(row.portraitEnc) : null,
      turns: await readTurns(tx, row.id),
    };
  });
}

export function createDiagnostic(
  owner: Owner,
  input: { state: ProfileState; first: { question: Question; source: string }; promptVersion: string },
): Promise<string> {
  return scoped(owner, async (tx) => {
    // Un seul entretien actif à la fois : les précédents non terminés sont abandonnés.
    await tx
      .update(diagnostics)
      .set({ status: "abandoned" })
      .where(and(owns(owner), inArray(diagnostics.status, ["in_progress", "portrait_ready"])));

    const [row] = await tx
      .insert(diagnostics)
      .values({
        userId: owner.kind === "user" ? owner.userId : null,
        anonSessionHash: owner.kind === "anon" ? owner.sessionHash : null,
        stateEnc: encryptJson(input.state),
        promptVersion: input.promptVersion,
        expiresAt: owner.kind === "anon" ? sql`now() + make_interval(days => ${ANON_TTL_DAYS})` : null,
      })
      .returning({ id: diagnostics.id });

    await tx.insert(diagnosticTurns).values({
      diagnosticId: row.id,
      userId: owner.kind === "user" ? owner.userId : null,
      turn: 1,
      questionEnc: encryptJson(input.first.question),
      source: input.first.source,
    });
    return row.id;
  });
}

export class ConcurrentAnswerError extends Error {}

/**
 * Enregistre la réponse au tour `turn` et pose la question suivante (ou passe au portrait).
 * Concurrence optimiste : si le tour a déjà été répondu (double clic, deux onglets), rien n'est écrit.
 */
export function recordTurn(
  owner: Owner,
  input: {
    diagnosticId: string;
    turn: number;
    answer: { answer: Answer; text: string };
    state: ProfileState;
    next: { question: Question; source: string } | null;
    portrait: Portrait | null;
  },
): Promise<void> {
  return scoped(owner, async (tx) => {
    const updated = await tx
      .update(diagnostics)
      .set({
        turnCount: input.turn,
        stateEnc: encryptJson(input.state),
        ...(input.next ? {} : { status: "portrait_ready" as const, portraitEnc: encryptJson(input.portrait) }),
      })
      .where(
        and(
          owns(owner),
          eq(diagnostics.id, input.diagnosticId),
          eq(diagnostics.status, "in_progress"),
          eq(diagnostics.turnCount, input.turn - 1),
        ),
      )
      .returning({ id: diagnostics.id });
    if (updated.length === 0) throw new ConcurrentAnswerError();

    await tx
      .update(diagnosticTurns)
      .set({ answerEnc: encryptJson(input.answer) })
      .where(and(eq(diagnosticTurns.diagnosticId, input.diagnosticId), eq(diagnosticTurns.turn, input.turn)));

    if (input.next) {
      await tx.insert(diagnosticTurns).values({
        diagnosticId: input.diagnosticId,
        userId: owner.kind === "user" ? owner.userId : null,
        turn: input.turn + 1,
        questionEnc: encryptJson(input.next.question),
        source: input.next.source,
      });
    }
  });
}

export function updatePortrait(owner: Owner, diagnosticId: string, state: ProfileState, portrait: Portrait) {
  return scoped(owner, async (tx) => {
    await tx
      .update(diagnostics)
      .set({ stateEnc: encryptJson(state), portraitEnc: encryptJson(portrait) })
      .where(and(owns(owner), eq(diagnostics.id, diagnosticId), eq(diagnostics.status, "portrait_ready")));
  });
}

/** L'utilisateur se reconnaît dans son portrait : le diagnostic est terminé. */
export function completeDiagnostic(owner: Owner, diagnosticId: string, state: ProfileState) {
  return scoped(owner, async (tx) => {
    const done = await tx
      .update(diagnostics)
      .set({ status: "completed", portraitValidatedAt: sql`now()`, completedAt: sql`now()` })
      .where(and(owns(owner), eq(diagnostics.id, diagnosticId), eq(diagnostics.status, "portrait_ready")))
      .returning({ id: diagnostics.id });
    if (done.length && owner.kind === "user") await syncProfile(tx, owner.userId, state);
    return done.length > 0;
  });
}

/** Reporte le terrain (pays, ville, devise) sur le profil : sert aux idées, au plan et aux montants. */
async function syncProfile(tx: Tx, userId: string, state: ProfileState) {
  const market = state.slots.market?.value;
  const country = countryByCode(market?.countryCode);
  if (!country && !market?.city) return;
  await tx
    .update(profiles)
    .set({
      ...(country ? { country: country.code, currency: country.currency } : {}),
      ...(market?.city ? { city: market.city } : {}),
    })
    .where(eq(profiles.userId, userId));
}

/**
 * Rattache au compte les diagnostics faits avant l'inscription.
 * Contexte système obligatoire (les lignes anonymes n'ont pas de user_id), filtré par le hachage de session.
 */
export function claimAnonymousDiagnostics(userId: string, sessionHash: string): Promise<number> {
  return withSystem("rattachement-diagnostic", async (tx) => {
    const claimed = await tx
      .update(diagnostics)
      .set({ userId, anonSessionHash: null, expiresAt: null })
      .where(and(eq(diagnostics.anonSessionHash, sessionHash), isNull(diagnostics.userId)))
      .returning({ id: diagnostics.id, status: diagnostics.status, stateEnc: diagnostics.stateEnc });
    if (claimed.length === 0) return 0;

    const ids = claimed.map((c) => c.id);
    await tx.update(diagnosticTurns).set({ userId }).where(inArray(diagnosticTurns.diagnosticId, ids));

    // Les anciens entretiens actifs du compte cèdent la place à celui qu'on vient de rattacher.
    await tx
      .update(diagnostics)
      .set({ status: "abandoned" })
      .where(
        and(
          eq(diagnostics.userId, userId),
          inArray(diagnostics.status, ["in_progress", "portrait_ready"]),
          notInArray(diagnostics.id, ids),
        ),
      );

    const completed = claimed.find((c) => c.status === "completed");
    if (completed) await syncProfile(tx, userId, decryptJson<ProfileState>(completed.stateEnc));
    return claimed.length;
  });
}

/** Purge RGPD : diagnostics anonymes non rattachés après 7 jours (les tours suivent par cascade). */
export function purgeExpiredDiagnostics(): Promise<number> {
  return withSystem("purge-diagnostics", async (tx) => {
    const deleted = await tx
      .delete(diagnostics)
      .where(and(isNull(diagnostics.userId), lt(diagnostics.expiresAt, sql`now()`)))
      .returning({ id: diagnostics.id });
    return deleted.length;
  });
}
