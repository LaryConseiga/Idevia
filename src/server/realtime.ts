import "server-only";
import { createRealtime, rawSql, type SealedLiveQuery } from "@neon/realtime/server";
import { sql } from "drizzle-orm";
import { withUser } from "@/server/dal/context";
import { env } from "@/server/env";

/**
 * Neon Realtime : requêtes SQL en direct, scellées côté serveur avec NEON_REALTIME_SECRET.
 * Realtime ne gère pas encore la RLS : l'autorisation est DANS la requête (`user_id = $1`, pris dans la session),
 * et seules des tables de projection sans donnée sensible lui sont exposées.
 */

export const realtime =
  env.NEON_REALTIME_URL && env.NEON_REALTIME_SECRET
    ? createRealtime({ secret: env.NEON_REALTIME_SECRET, db: new URL(env.DATABASE_APP_URL).pathname.slice(1) })
    : null;

export const realtimeUrl = realtime ? env.NEON_REALTIME_URL! : null;

/** Avancement du diagnostic le plus récent : statut et nombre de réponses, rien d'autre. */
export type DiagnosticProgressRow = { id: string; status: string; turn_count: number };

// Realtime rejette les tables sous RLS : on s'abonne à la projection diagnostic_progress (sans donnée personnelle,
// tenue à jour par trigger, illisible pour le rôle applicatif). Voir drizzle/0003_diagnostic_progress_sync.sql.
const PROGRESS_SQL = `SELECT diagnostic_id AS id, status, turn_count FROM diagnostic_progress WHERE user_id = $1`;

const progressQuery = (userId: string) => rawSql<DiagnosticProgressRow>(PROGRESS_SQL, [userId]);

export function sealDiagnosticProgress(userId: string): Promise<SealedLiveQuery<DiagnosticProgressRow>> {
  if (!realtime) throw new Error("Realtime non configuré");
  return realtime.seal({ query: progressQuery(userId) });
}

/**
 * Rendu serveur : mêmes lignes que la projection, lues à la source dans le contexte RLS de l'utilisateur
 * (le rôle applicatif n'a pas accès à la projection).
 */
export async function loadDiagnosticProgress(userId: string) {
  if (!realtime) return null;
  const [initialData, sealedQuery] = await Promise.all([
    withUser(userId, async (tx) => {
      const result = await tx.execute<DiagnosticProgressRow>(
        sql`SELECT id, status, turn_count FROM diagnostics
            WHERE user_id = ${userId} AND status IN ('in_progress', 'portrait_ready', 'completed')
            ORDER BY created_at DESC LIMIT 1`,
      );
      return result.rows;
    }),
    sealDiagnosticProgress(userId),
  ]);
  return { initialData, sealedQuery };
}
