import "server-only";
import { sql } from "drizzle-orm";
import { db, type Tx } from "@/server/db/client";

/**
 * Seuls points d'entrée vers la base pour le code métier.
 * Chaque appel ouvre une transaction et positionne le contexte RLS (voir drizzle/0001_rls.sql).
 */

/** Exécute `fn` avec les droits d'un utilisateur : la base ne lui expose que ses propres lignes. */
export function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!userId) throw new Error("withUser: userId manquant");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

/**
 * Exécute `fn` en contexte système (auth, jobs, agrégats admin, diagnostics anonymes).
 * `reason` documente chaque usage et apparaît dans les traces d'erreur.
 */
export function withSystem<T>(reason: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db
    .transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.system', 'on', true)`);
      return fn(tx);
    })
    .catch((error: unknown) => {
      throw new Error(`withSystem(${reason}) a échoué`, { cause: error });
    });
}
