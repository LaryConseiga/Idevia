import "server-only";
import { ai } from "@/server/ai";
import {
  appendExchange,
  assistantTokensThisMonth,
  clearConversation,
  getMemory,
  listMessages,
  setMemory,
} from "@/server/dal/assistant";
import { getLatestDiagnostic } from "@/server/dal/diagnostics";
import { getIdea } from "@/server/dal/ideas";
import { getActiveProject, type StoredProject } from "@/server/dal/projects";
import { env } from "@/server/env";
import { profileBrief } from "@/server/ideas/prompts";
import { consume, limits } from "@/server/ratelimit";
import { askCoach, mergeMemory, type CoachContext } from "./coach";
import type { CoachView } from "./view";

/** Cas d'usage du coach. L'utilisateur est toujours celui de la session (vérifié par l'appelant). */

export const MESSAGE_MAX = 1500;
/** Coût moyen mesuré d'un échange (contexte du projet compris), pour parler en messages plutôt qu'en tokens. */
const TOKENS_PER_MESSAGE = 3000;

export type SendResult =
  | { ok: true; reply: { id: string; content: string }; question: { id: string }; remembered: string[]; quota: CoachView["quota"] }
  | { ok: false; error: string };

async function quota(userId: string): Promise<CoachView["quota"]> {
  const used = await assistantTokensThisMonth(userId);
  const left = Math.max(0, env.ASSISTANT_MONTHLY_TOKENS - used);
  return {
    percentLeft: Math.round((left / env.ASSISTANT_MONTHLY_TOKENS) * 100),
    messagesLeft: Math.floor(left / TOKENS_PER_MESSAGE),
    exhausted: left < TOKENS_PER_MESSAGE / 2,
  };
}

/** Suggestions de départ, selon où en est la personne. */
function suggestionsFor(project: StoredProject): string[] {
  const next = project.tasks.find((t) => t.status !== "done");
  const list = [
    next ? `Je bloque sur l'étape « ${next.title} ». Par quoi je commence ?` : "J'ai fini mon plan. Quelle est la suite ?",
    "Écris-moi le message à envoyer à mes premiers clients.",
    "Comment fixer mon prix sans faire fuir les clients ?",
  ];
  if (project.check.status === "none") list.push("Comment savoir si des gens achèteraient vraiment ?");
  else if (project.hypotheses.some((h) => h.status === "untested")) list.push("Aide-moi à tester ma première hypothèse.");
  return list;
}

export async function getCoachView(userId: string): Promise<CoachView | null> {
  const project = await getActiveProject(userId);
  if (!project) return null;
  const [messages, memory, q] = await Promise.all([listMessages(userId, project.id), getMemory(userId, project.id), quota(userId)]);
  return {
    projectName: project.name,
    messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
    memory,
    quota: q,
    suggestions: suggestionsFor(project),
  };
}

async function contextFor(userId: string, project: StoredProject): Promise<CoachContext | null> {
  const [diagnostic, idea, memory] = await Promise.all([
    getLatestDiagnostic({ kind: "user", userId }),
    project.ideaId ? getIdea(userId, project.ideaId) : null,
    getMemory(userId, project.id),
  ]);
  if (!diagnostic) return null;
  const report = project.check.status === "ready" ? project.check.data.report : null;
  return {
    brief: profileBrief(diagnostic.state, diagnostic.portrait),
    state: diagnostic.state,
    project: { name: project.name, idea: idea?.content ?? null },
    tasks: project.tasks.map((t) => ({
      title: t.title,
      period: t.period,
      dueDate: t.dueDate,
      done: t.status === "done",
      description: t.description,
    })),
    field: report
      ? {
          headline: report.headline,
          angle: report.angle,
          demand: `${report.demand.level}, ${report.demand.text}`,
          competition: `${report.competition.level}, ${report.competition.text}`,
        }
      : null,
    hypotheses: project.hypotheses.map((h) => ({ hypothesis: h.hypothesis, status: h.status })),
    memory,
    today: new Date().toISOString().slice(0, 10),
  };
}

export async function sendCoachMessage(userId: string, text: string): Promise<SendResult> {
  const message = text.trim();
  if (!message) return { ok: false, error: "Écris ta question." };
  if (message.length > MESSAGE_MAX) return { ok: false, error: `Ton message est trop long (${MESSAGE_MAX} caractères au plus).` };

  const verdict = await consume(`coach:${userId}`, limits.assistantMessage);
  if (!verdict.allowed) return { ok: false, error: "Tu vas un peu vite. Attends quelques secondes avant ton prochain message." };

  const project = await getActiveProject(userId);
  if (!project) return { ok: false, error: "Choisis d'abord ton idée : le coach t'accompagne sur ton projet." };
  if ((await quota(userId)).exhausted) {
    return { ok: false, error: "Tu as utilisé tous tes échanges avec le coach ce mois-ci. Ils reviennent le mois prochain." };
  }

  const [context, history] = await Promise.all([contextFor(userId, project), listMessages(userId, project.id)]);
  if (!context) return { ok: false, error: "Termine d'abord ton diagnostic." };

  const answer = await askCoach({
    context,
    history: history.map((m) => ({ role: m.role, content: m.content })),
    message,
    generate: ai.generate,
    userId,
  });
  if (!answer) return { ok: false, error: "Le coach n'a pas pu répondre cette fois-ci. Réessaie dans un instant." };

  const [question, reply] = await appendExchange(userId, project.id, message, answer.reply);
  const memory = mergeMemory(context.memory, answer.remember);
  const remembered = memory.filter((fact) => !context.memory.includes(fact));
  if (remembered.length) await setMemory(userId, project.id, memory);

  return { ok: true, question: { id: question.id }, reply: { id: reply.id, content: answer.reply }, remembered, quota: await quota(userId) };
}

export async function forgetFact(userId: string, fact: string) {
  const project = await getActiveProject(userId);
  if (!project) return;
  const memory = await getMemory(userId, project.id);
  await setMemory(userId, project.id, memory.filter((f) => f !== fact));
}

export async function resetConversation(userId: string) {
  const project = await getActiveProject(userId);
  if (project) await clearConversation(userId, project.id);
}
