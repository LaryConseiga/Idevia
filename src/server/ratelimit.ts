import "server-only";
import { Redis } from "@upstash/redis";
import { env, isProd } from "@/server/env";

/**
 * Limitation de fréquence à fenêtre fixe, atomique (INCR + EXPIRE dans un script Lua).
 * Upstash Redis en production ; mémoire locale en développement.
 */

export type Rule = { window: number; max: number }; // window en secondes
export type Verdict = { allowed: boolean; retryAfter: number | null };

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

let warned = false;

const SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
`;

const memory = new Map<string, { count: number; resetAt: number }>();

export async function consume(key: string, rule: Rule): Promise<Verdict> {
  const fullKey = `rl:${key}`;
  if (redis) {
    const [count, ttl] = await redis.eval<[string], [number, number]>(SCRIPT, [fullKey], [String(rule.window)]);
    return count <= rule.max ? { allowed: true, retryAfter: null } : { allowed: false, retryAfter: Math.max(ttl, 1) };
  }

  if (isProd && !warned) {
    warned = true;
    console.warn("[ratelimit] Upstash non configuré : limitation en mémoire, inefficace entre instances.");
  }
  const now = Date.now();
  const entry = memory.get(fullKey);
  if (!entry || entry.resetAt <= now) {
    memory.set(fullKey, { count: 1, resetAt: now + rule.window * 1000 });
    return { allowed: true, retryAfter: null };
  }
  entry.count += 1;
  if (entry.count <= rule.max) return { allowed: true, retryAfter: null };
  return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}

/** Règles applicatives (hors authentification, gérée dans server/auth). */
export const limits = {
  diagnosticStart: { window: 3600, max: 10 },
  diagnosticTurn: { window: 60, max: 20 },
  aiGeneration: { window: 3600, max: 30 },
  assistantMessage: { window: 60, max: 10 },
  dataExport: { window: 3600, max: 3 },
  analyticsBeacon: { window: 60, max: 120 },
} satisfies Record<string, Rule>;
