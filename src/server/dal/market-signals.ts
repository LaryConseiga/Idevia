import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { marketSignals } from "@/server/db/schema";
import { withSystem } from "./context";

/**
 * Cache partagé des signaux de marché : données publiques et agrégées, sans lien avec une personne.
 * Un même signal sert à tous ceux qui cherchent la même chose au même endroit pendant 30 jours.
 */

const TTL_DAYS = 30;

export type CachedSignal = {
  id: string;
  payload: unknown;
  sourceUrl: string | null;
  limits: string | null;
  query: string;
  collectedAt: Date;
};

export function getCachedSignal(cacheKey: string): Promise<CachedSignal | null> {
  return withSystem("market-signals:read", async (tx) => {
    const [row] = await tx
      .select()
      .from(marketSignals)
      .where(and(eq(marketSignals.cacheKey, cacheKey), gt(marketSignals.expiresAt, sql`now()`)))
      .limit(1);
    return row
      ? { id: row.id, payload: row.payload, sourceUrl: row.sourceUrl, limits: row.limits, query: row.query, collectedAt: row.collectedAt }
      : null;
  });
}

export function storeSignal(input: {
  cacheKey: string;
  kind: string;
  actor: string;
  query: string;
  country: string;
  city: string | null;
  payload: unknown;
  sourceUrl: string;
  limits: string;
  costUsd: number;
}): Promise<{ id: string; collectedAt: Date }> {
  return withSystem("market-signals:write", async (tx) => {
    const values = {
      ...input,
      costUsd: Math.round(input.costUsd * 1_000_000),
      collectedAt: sql`now()`,
      expiresAt: sql`now() + make_interval(days => ${TTL_DAYS})`,
    };
    const [row] = await tx
      .insert(marketSignals)
      .values(values)
      .onConflictDoUpdate({ target: marketSignals.cacheKey, set: values })
      .returning({ id: marketSignals.id, collectedAt: marketSignals.collectedAt });
    return row;
  });
}
