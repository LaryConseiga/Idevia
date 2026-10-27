import "server-only";
import { getCachedSignal, storeSignal } from "@/server/dal/market-signals";
import { ApifyError, budgetAvailable, runActor } from "./apify";
import type { Collect, CollectedSignal } from "./field-check";
import { SOURCES, cacheKeyOf } from "./sources";

/**
 * Délai maximal par source : au-delà, on garde les résultats partiels. Google Maps et la bibliothèque Meta
 * mettent souvent plus d'une minute ; la recherche Google une dizaine de secondes.
 */
const TIMEOUT_SEC = { local_competition: 90, search_demand: 60, ads: 90 } as const;

/** Signal en cache s'il a moins de 30 jours, sinon collecte réelle (si le budget du mois le permet). */
export const collectSignal: Collect = async (kind, query) => {
  const spec = SOURCES[kind];
  const cacheKey = cacheKeyOf(kind, query);
  const cached = await getCachedSignal(cacheKey);
  if (cached) {
    return {
      id: cached.id,
      kind,
      query: cached.query,
      sourceUrl: cached.sourceUrl ?? spec.sourceUrl(query),
      limits: cached.limits ?? spec.limits,
      collectedAt: cached.collectedAt.toISOString(),
      cached: true,
      payload: cached.payload as CollectedSignal["payload"],
    };
  }

  if (!(await budgetAvailable())) throw new ApifyError("budget");
  const items = await runActor(spec.actor, spec.input(query), TIMEOUT_SEC[kind]);
  const payload = spec.normalize(items, query);
  const stored = await storeSignal({
    cacheKey,
    kind,
    actor: spec.actor,
    query: spec.query(query),
    country: query.countryCode,
    city: query.city,
    payload,
    sourceUrl: spec.sourceUrl(query),
    limits: spec.limits,
    costUsd: spec.estimatedCostUsd,
  });
  return {
    id: stored.id,
    kind,
    query: spec.query(query),
    sourceUrl: spec.sourceUrl(query),
    limits: spec.limits,
    collectedAt: stored.collectedAt.toISOString(),
    cached: false,
    payload,
  };
};
