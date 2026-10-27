import "server-only";
import { env } from "@/server/env";

/**
 * Client Apify minimal (API REST, aucun SDK). Le jeton ne quitte jamais le serveur.
 * Plan gratuit : 5 $ de crédits par mois ; on s'arrête à 90 % pour ne jamais dépasser.
 */

const API = "https://api.apify.com/v2";
const BUDGET_RATIO = 0.9;

export class ApifyError extends Error {
  constructor(
    readonly code: "not_configured" | "budget" | "timeout" | "http",
    readonly status: number | null = null,
  ) {
    super(`apify:${code}${status ? `:${status}` : ""}`);
  }
}

export const apifyConfigured = () => Boolean(env.APIFY_TOKEN);

type Run = { id: string; status: string; defaultDatasetId: string };

async function api<T>(path: string, init?: RequestInit, timeoutMs = 20_000): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.APIFY_TOKEN}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApifyError("timeout");
  }
  if (!response.ok) throw new ApifyError("http", response.status);
  return (await response.json()) as T;
}

const FINISHED = new Set(["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"]);

/**
 * Lance un actor, l'arrête au bout de `timeoutSec`, puis lit ses résultats, y compris partiels :
 * un scraper Google Maps coupé à 20 lieux sur 20 demandés vaut mieux que rien.
 */
export async function runActor(actor: string, input: Record<string, unknown>, timeoutSec: number): Promise<unknown[]> {
  if (!env.APIFY_TOKEN) throw new ApifyError("not_configured");
  let { data: run } = await api<{ data: Run }>(`/acts/${actor}/runs?timeout=${timeoutSec}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const deadline = Date.now() + (timeoutSec + 30) * 1000;
  while (!FINISHED.has(run.status)) {
    if (Date.now() > deadline) {
      await api(`/actor-runs/${run.id}/abort`, { method: "POST" }).catch(() => {});
      break;
    }
    // L'API garde la requête ouverte jusqu'à la fin du run ou `waitForFinish` secondes ; elle dépasse parfois ce
    // délai quand plusieurs runs tournent : un suivi interrompu n'est pas un échec, on réessaie jusqu'à l'échéance.
    try {
      ({ data: run } = await api<{ data: Run }>(`/actor-runs/${run.id}?waitForFinish=20`, undefined, 35_000));
    } catch (error) {
      if (!(error instanceof ApifyError && error.code === "timeout")) throw error;
    }
  }
  if (run.status === "FAILED") throw new ApifyError("http", null);
  const items = await api<unknown>(`/datasets/${run.defaultDatasetId}/items?clean=true&format=json`);
  return Array.isArray(items) ? items : [];
}

let budgetCache: { at: number; ok: boolean } | null = null;

/** Reste-t-il du crédit ce mois-ci ? (mis en cache 5 minutes ; en cas de doute, on refuse). */
export async function budgetAvailable(): Promise<boolean> {
  if (!env.APIFY_TOKEN) return false;
  if (budgetCache && Date.now() - budgetCache.at < 5 * 60_000) return budgetCache.ok;
  try {
    const response = await fetch(`${API}/users/me/limits`, {
      headers: { Authorization: `Bearer ${env.APIFY_TOKEN}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(String(response.status));
    const body = (await response.json()) as {
      data?: { limits?: { maxMonthlyUsageUsd?: number }; current?: { monthlyUsageUsd?: number } };
    };
    const max = body.data?.limits?.maxMonthlyUsageUsd ?? 0;
    const used = body.data?.current?.monthlyUsageUsd ?? max;
    budgetCache = { at: Date.now(), ok: max > 0 && used < max * BUDGET_RATIO };
  } catch {
    budgetCache = { at: Date.now(), ok: false };
  }
  return budgetCache.ok;
}
