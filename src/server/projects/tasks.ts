import type { IdeaContent } from "@/server/ideas/schemas";

/**
 * Le plan des 30 premiers jours devient une liste de tâches datées.
 * Module pur : la date de départ est injectée.
 */

export type NewTask = {
  title: string;
  period: string;
  description: string;
  expectedResult: string | null;
  dueDate: string;
  estimatedMinutes: number | null;
  priority: "low" | "medium" | "high";
  sortOrder: number;
};

const HORIZON_DAYS = 30;

/** Dernier jour couvert par une période : « Jours 4 à 7 » → 7, « Semaine 2 » → 14, sinon une semaine par étape. */
export function periodEndDay(period: string, index: number): number {
  const normalized = period.toLowerCase();
  const numbers = [...normalized.matchAll(/\d+/g)].map((m) => Number(m[0]));
  const last = numbers.at(-1);
  let day: number;
  if (last === undefined) day = (index + 1) * 7;
  else if (/semaine/.test(normalized)) day = last * 7;
  else day = last;
  return Math.min(Math.max(day, 1), HORIZON_DAYS);
}

export function addDays(start: Date, days: number): string {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + days));
  return d.toISOString().slice(0, 10);
}

export function tasksFromIdea(content: IdeaContent, start: Date): NewTask[] {
  const first: NewTask = {
    title: "Ta première action",
    period: "Aujourd'hui",
    description: content.todayAction,
    expectedResult: null,
    dueDate: addDays(start, 0),
    estimatedMinutes: 30,
    priority: "high",
    sortOrder: 0,
  };
  let previous = 0;
  const steps = content.plan.map((step, i): NewTask => {
    // Les dates restent dans l'ordre même si le modèle a écrit des périodes qui se chevauchent.
    const end = Math.max(periodEndDay(step.period, i), previous);
    previous = end;
    return {
      title: step.title,
      period: step.period,
      description: step.story,
      expectedResult: step.milestone,
      dueDate: addDays(start, end - 1),
      estimatedMinutes: null,
      priority: i === 0 ? "high" : "medium",
      sortOrder: i + 1,
    };
  });
  return [first, ...steps];
}
