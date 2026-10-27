import type { DueReminder } from "@/server/dal/reminders";

/**
 * Envoi des rappels du jour. Module pur (sélection, envoi et marquage injectés) pour être testé sans réseau.
 * Un envoi raté n'empêche pas les autres ; seuls les rappels réellement partis sont marqués.
 */

/** Offre gratuite Resend : 100 emails par jour, on garde une marge pour les emails de connexion. */
export const DAILY_CAP = 80;

const dueFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
export const formatDue = (date: string) => dueFormat.format(new Date(`${date}T00:00:00Z`));

export type Mail = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

export async function runReminders(deps: {
  select: (limit: number) => Promise<DueReminder[]>;
  compose: (r: DueReminder) => Mail;
  send: (mail: Mail) => Promise<void>;
  mark: (projectIds: string[]) => Promise<void>;
}): Promise<{ selected: number; sent: number; failed: number }> {
  const due = await deps.select(DAILY_CAP);
  const sent: string[] = [];
  let failed = 0;
  for (const reminder of due) {
    try {
      await deps.send(deps.compose(reminder));
      sent.push(reminder.projectId);
    } catch {
      failed += 1;
    }
  }
  await deps.mark(sent);
  return { selected: due.length, sent: sent.length, failed };
}
