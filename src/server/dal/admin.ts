import "server-only";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { adminAuditLogs } from "@/server/db/schema";
import { user } from "@/server/db/schema/auth";
import { withSystem } from "./context";

/**
 * Administration : uniquement des agrégats et des métadonnées de compte.
 * Aucune fonction ici ne lit un contenu personnel (réponses, idées, messages) : ils restent chiffrés et privés.
 */

export type Overview = {
  users: { total: number; last7: number; verified: number; banned: number };
  funnel: { label: string; count: number }[];
  activity: { label: string; month: number; total: number }[];
  waitlist: number;
  pendingDeletions: number;
};

const n = (v: unknown) => Number(v ?? 0);

export function getOverview(): Promise<Overview> {
  return withSystem("admin:overview", async (tx) => {
    const { rows } = await tx.execute<Record<string, unknown>>(sql`
      select
        (select count(*) from "user") as users,
        (select count(*) from "user" where created_at > now() - interval '7 days') as users_7,
        (select count(*) from "user" where email_verified) as verified,
        (select count(*) from "user" where coalesce(banned, false)) as banned,
        (select count(distinct user_id) from diagnostics where user_id is not null and status = 'completed') as f_diag,
        (select count(distinct user_id) from idea_batches where status = 'ready') as f_ideas,
        (select count(distinct user_id) from projects) as f_project,
        (select count(distinct user_id) from tasks where status = 'done') as f_task,
        (select count(distinct user_id) from field_checks where status = 'ready') as f_field,
        (select count(*) from diagnostics where status = 'completed' and completed_at >= date_trunc('month', now())) as a_diag_m,
        (select count(*) from diagnostics where status = 'completed') as a_diag,
        (select count(*) from idea_batches where status = 'ready' and created_at >= date_trunc('month', now())) as a_ideas_m,
        (select count(*) from idea_batches where status = 'ready') as a_ideas,
        (select count(*) from tasks where status = 'done' and completed_at >= date_trunc('month', now())) as a_tasks_m,
        (select count(*) from tasks where status = 'done') as a_tasks,
        (select count(*) from field_checks where status = 'ready' and created_at >= date_trunc('month', now())) as a_field_m,
        (select count(*) from field_checks where status = 'ready') as a_field,
        (select count(*) from assistant_messages where role = 'user' and created_at >= date_trunc('month', now())) as a_coach_m,
        (select count(*) from assistant_messages where role = 'user') as a_coach,
        (select count(*) from diagnostics where user_id is null) as anon_diag,
        (select count(*) from pro_waitlist) as waitlist,
        (select count(*) from deletion_requests where status = 'pending') as deletions
    `);
    const r = rows[0];
    return {
      users: { total: n(r.users), last7: n(r.users_7), verified: n(r.verified), banned: n(r.banned) },
      funnel: [
        { label: "Comptes créés", count: n(r.users) },
        { label: "Diagnostic terminé", count: n(r.f_diag) },
        { label: "Idées reçues", count: n(r.f_ideas) },
        { label: "Idée choisie", count: n(r.f_project) },
        { label: "Au moins une étape faite", count: n(r.f_task) },
        { label: "Terrain vérifié", count: n(r.f_field) },
      ],
      activity: [
        { label: "Diagnostics terminés", month: n(r.a_diag_m), total: n(r.a_diag) },
        { label: "Générations d'idées", month: n(r.a_ideas_m), total: n(r.a_ideas) },
        { label: "Étapes faites", month: n(r.a_tasks_m), total: n(r.a_tasks) },
        { label: "Vérifications terrain", month: n(r.a_field_m), total: n(r.a_field) },
        { label: "Messages au coach", month: n(r.a_coach_m), total: n(r.a_coach) },
        { label: "Diagnostics anonymes en cours", month: n(r.anon_diag), total: n(r.anon_diag) },
      ],
      waitlist: n(r.waitlist),
      pendingDeletions: n(r.deletions),
    };
  });
}

export type AiCost = { provider: string; model: string; calls: number; failures: number; tokens: number; avgMs: number };
export type AiByTask = { task: string; calls: number; failures: number; tokens: number };

export function getAiUsage(days: number): Promise<{ byProvider: AiCost[]; byTask: AiByTask[]; topErrors: { code: string; count: number }[] }> {
  return withSystem("admin:ai-usage", async (tx) => {
    const since = sql`now() - make_interval(days => ${days})`;
    const [byProvider, byTask, errors] = await Promise.all([
      tx.execute<Record<string, unknown>>(sql`
        select provider, model, count(*) as calls, count(*) filter (where not success) as failures,
               coalesce(sum(input_tokens + output_tokens), 0) as tokens, coalesce(avg(latency_ms), 0)::int as avg_ms
        from ai_usage where created_at >= ${since}
        group by provider, model order by calls desc`),
      tx.execute<Record<string, unknown>>(sql`
        select feature as task, count(*) as calls, count(*) filter (where not success) as failures,
               coalesce(sum(input_tokens + output_tokens), 0) as tokens
        from ai_usage where created_at >= ${since}
        group by feature order by calls desc`),
      tx.execute<Record<string, unknown>>(sql`
        select error_code as code, count(*) as count from ai_usage
        where created_at >= ${since} and not success and error_code is not null
        group by error_code order by count desc limit 6`),
    ]);
    return {
      byProvider: byProvider.rows.map((r) => ({
        provider: String(r.provider),
        model: String(r.model),
        calls: n(r.calls),
        failures: n(r.failures),
        tokens: n(r.tokens),
        avgMs: n(r.avg_ms),
      })),
      byTask: byTask.rows.map((r) => ({ task: String(r.task), calls: n(r.calls), failures: n(r.failures), tokens: n(r.tokens) })),
      topErrors: errors.rows.map((r) => ({ code: String(r.code), count: n(r.count) })),
    };
  });
}

/** Signaux de marché collectés ce mois-ci (coût estimé, hors cache) : à comparer au crédit Apify. */
export function getMarketUsage(): Promise<{ runs: number; estimatedUsd: number; cached: number }> {
  return withSystem("admin:market-usage", async (tx) => {
    const { rows } = await tx.execute<Record<string, unknown>>(sql`
      select count(*) as runs, coalesce(sum(cost_micro_usd), 0) as micro,
             (select count(*) from market_signals where expires_at > now()) as cached
      from market_signals where collected_at >= date_trunc('month', now())`);
    return { runs: n(rows[0].runs), estimatedUsd: n(rows[0].micro) / 1_000_000, cached: n(rows[0].cached) };
  });
}

// ---------------------------------------------------------------- Utilisateurs

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  banned: boolean;
  createdAt: Date;
  stage: string;
};

const PAGE = 50;

/** Comptes et étape atteinte dans le parcours : métadonnées uniquement. */
export function listUsers(query: string, page: number): Promise<{ rows: AdminUserRow[]; hasMore: boolean }> {
  return withSystem("admin:list-users", async (tx) => {
    const search = query.trim();
    const { rows } = await tx.execute<Record<string, unknown>>(sql`
      select u.id, u.name, u.email, coalesce(u.role, 'user') as role, u.email_verified, coalesce(u.banned, false) as banned,
             u.created_at,
             case
               when exists (select 1 from tasks t where t.user_id = u.id and t.status = 'done') then 'En action'
               when exists (select 1 from projects p where p.user_id = u.id) then 'Idée choisie'
               when exists (select 1 from idea_batches b where b.user_id = u.id and b.status = 'ready') then 'Idées reçues'
               when exists (select 1 from diagnostics d where d.user_id = u.id and d.status = 'completed') then 'Diagnostic fait'
               when exists (select 1 from diagnostics d where d.user_id = u.id) then 'Diagnostic en cours'
               else 'Inscrit'
             end as stage
      from "user" u
      ${search ? sql`where u.email ilike ${`%${search.replace(/[%_\\]/g, "\\$&")}%`} or u.name ilike ${`%${search.replace(/[%_\\]/g, "\\$&")}%`}` : sql``}
      order by u.created_at desc
      limit ${PAGE + 1} offset ${Math.max(0, page) * PAGE}`);
    return {
      hasMore: rows.length > PAGE,
      rows: rows.slice(0, PAGE).map((r) => ({
        id: String(r.id),
        name: String(r.name),
        email: String(r.email),
        role: String(r.role),
        verified: Boolean(r.email_verified),
        banned: Boolean(r.banned),
        createdAt: new Date(String(r.created_at)),
        stage: String(r.stage),
      })),
    };
  });
}

export function getUserBrief(userId: string) {
  return withSystem("admin:user-brief", async (tx) => {
    const [row] = await tx
      .select({ id: user.id, email: user.email, role: user.role, banned: user.banned })
      .from(user)
      .where(eq(user.id, userId));
    return row ?? null;
  });
}

// ---------------------------------------------------------------- Journal d'audit

export function audit(input: { adminUserId: string; action: string; targetType?: string; targetId?: string; reason?: string }) {
  return withSystem("admin:audit", (tx) =>
    tx.insert(adminAuditLogs).values({
      adminUserId: input.adminUserId,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      reason: input.reason?.slice(0, 500) ?? null,
    }),
  );
}

export function listAudit(limit = 100, action?: string) {
  return withSystem("admin:list-audit", async (tx) => {
    return tx
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        reason: adminAuditLogs.reason,
        createdAt: adminAuditLogs.createdAt,
        adminEmail: user.email,
      })
      .from(adminAuditLogs)
      .leftJoin(user, eq(user.id, adminAuditLogs.adminUserId))
      .where(action ? and(ilike(adminAuditLogs.action, `${action}%`)) : undefined)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(limit);
  });
}
