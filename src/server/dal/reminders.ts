import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { profiles, projects } from "@/server/db/schema";
import { withSystem, withUser } from "./context";

/**
 * Rappels : la prochaine étape non faite d'un projet actif arrive à échéance (ou est en retard).
 * Au plus un rappel tous les 3 jours par projet, jamais le jour même où le projet est créé.
 */

export type DueReminder = {
  userId: string;
  projectId: string;
  email: string;
  name: string;
  task: string;
  dueDate: string;
  overdue: boolean;
};

export function dueReminders(limit: number): Promise<DueReminder[]> {
  return withSystem("reminders:select", async (tx) => {
    const result = await tx.execute<{
      user_id: string;
      project_id: string;
      email: string;
      name: string;
      task: string;
      due_date: string;
      overdue: boolean;
    }>(sql`
      select u.id as user_id, p.id as project_id, u.email, u.name, t.title as task,
             t.due_date::text as due_date, t.due_date < current_date as overdue
      from projects p
      join "user" u on u.id = p.user_id
      join profiles pr on pr.user_id = p.user_id
      join lateral (
        select title, due_date from tasks
        where project_id = p.id and status <> 'done'
        order by sort_order asc, created_at asc
        limit 1
      ) t on true
      where p.status = 'active'
        and pr.email_reminders
        and u.email_verified
        and coalesce(u.banned, false) = false
        and p.created_at < now() - interval '20 hours'
        and (p.last_reminder_at is null or p.last_reminder_at < now() - interval '3 days')
        and t.due_date <= current_date + 1
      order by t.due_date asc
      limit ${limit}
    `);
    return result.rows.map((r) => ({
      userId: r.user_id,
      projectId: r.project_id,
      email: r.email,
      name: r.name,
      task: r.task,
      dueDate: r.due_date,
      overdue: r.overdue,
    }));
  });
}

export function markReminded(projectIds: string[]) {
  if (!projectIds.length) return Promise.resolve();
  return withSystem("reminders:mark", async (tx) => {
    await tx.update(projects).set({ lastReminderAt: sql`now()` }).where(inArray(projects.id, projectIds));
  });
}

export function getEmailReminders(userId: string): Promise<boolean> {
  return withUser(userId, async (tx) => {
    const [row] = await tx.select({ on: profiles.emailReminders }).from(profiles).where(eq(profiles.userId, userId));
    return row?.on ?? true;
  });
}

export function setEmailReminders(userId: string, on: boolean) {
  return withUser(userId, async (tx) => {
    await tx.update(profiles).set({ emailReminders: on }).where(eq(profiles.userId, userId));
  });
}
