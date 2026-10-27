import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/env";
import * as schema from "./schema";

/**
 * node-postgres partout (recommandation Neon pour Vercel Fluid compute), via le pooler Neon (PgBouncer).
 * Le contexte RLS est posé avec set_config(..., true) : local à la transaction, compatible avec le pooling.
 * Connexion avec le rôle applicatif sans BYPASSRLS (DATABASE_APP_URL), jamais avec le propriétaire.
 * Ce module n'est importé que par la DAL et l'auth (règle ESLint `no-restricted-imports`).
 */
function create() {
  // Les URL Neon indiquent sslmode=require ; verify-full garde les mêmes vérifications sans l'avertissement de pg.
  const connectionString = env.DATABASE_APP_URL.replace("sslmode=require", "sslmode=verify-full");
  const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
  // Une connexion inactive coupée (compute mis en veille) ne doit pas faire tomber le serveur.
  pool.on("error", (error) => console.error("[db] connexion inactive perdue :", error.message));
  // Sur Vercel : ferme proprement les connexions inactives avant la suspension de l'instance.
  attachDatabasePool(pool);
  return drizzle(pool, { schema });
}

type Db = ReturnType<typeof create>;
const globalForDb = globalThis as unknown as { __ideviaDb?: Db };

export const db: Db = globalForDb.__ideviaDb ?? create();
if (env.NODE_ENV !== "production") globalForDb.__ideviaDb = db;

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
