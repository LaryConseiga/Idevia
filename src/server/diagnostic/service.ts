import "server-only";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { ai } from "@/server/ai";
import { sha256 } from "@/server/crypto";
import {
  claimAnonymousDiagnostics,
  completeDiagnostic,
  ConcurrentAnswerError,
  createDiagnostic,
  getLatestDiagnostic,
  recordTurn,
  updatePortrait,
  type Owner,
  type StoredDiagnostic,
} from "@/server/dal/diagnostics";
import { getCurrentUser } from "@/server/dal/session";
import { isProd } from "@/server/env";
import { consume, limits } from "@/server/ratelimit";
import { buildPortrait, MAX_TURNS, MIN_TURNS, nextTurn, openingQuestion } from "./engine";
import { completeness, DIMENSION_LABELS, DIMENSIONS, emptyProfile } from "./profile";
import { PROMPT_VERSION, type HistoryItem } from "./prompts";
import { answerSchema, answerToText, validateAnswer } from "./question";
import type { ActionResult, DiagnosticView } from "./view";

/**
 * Cas d'usage du diagnostic, appelés par les Server Actions et la page.
 * Le cookie anonyme ne contient qu'un jeton aléatoire ; la base n'en stocke que le hachage.
 */

export const ANON_COOKIE = isProd ? "__Host-idevia-diag" : "idevia-diag";
const ANON_MAX_AGE = 7 * 24 * 60 * 60;
const MAX_CORRECTIONS = 3;

type Viewer = { owner: Owner; userId: string | null } | null;

/** Clé de limitation : le compte, ou à défaut la session anonyme. */
const rateKey = (viewer: NonNullable<Viewer>) =>
  viewer.owner.kind === "user" ? `u:${viewer.owner.userId}` : `a:${viewer.owner.sessionHash}`;

async function currentViewer({ createAnonymous }: { createAnonymous: boolean }): Promise<Viewer> {
  const user = await getCurrentUser();
  if (user) return { owner: { kind: "user", userId: user.id }, userId: user.id };

  const jar = await cookies();
  let token = jar.get(ANON_COOKIE)?.value;
  if (!token || token.length < 40) {
    if (!createAnonymous) return null;
    token = randomBytes(32).toString("base64url");
    jar.set(ANON_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: ANON_MAX_AGE,
    });
  }
  return { owner: { kind: "anon", sessionHash: sha256(token) }, userId: null };
}

/** Lecture seule (page) : ne crée jamais de cookie. */
export async function loadDiagnosticView(): Promise<DiagnosticView | null> {
  const viewer = await currentViewer({ createAnonymous: false });
  if (!viewer) return null;
  const stored = await getLatestDiagnostic(viewer.owner);
  return stored ? toView(stored, viewer.owner) : null;
}

/** Un cookie anonyme existe alors que l'utilisateur est connecté : son entretien est à rattacher. */
export async function hasAnonymousToClaim(): Promise<boolean> {
  return Boolean((await cookies()).get(ANON_COOKIE)?.value);
}

export async function claimFromCookie(userId: string): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ANON_COOKIE)?.value;
  if (token) await claimAnonymousDiagnostics(userId, sha256(token));
  jar.delete(ANON_COOKIE);
}

function toView(stored: StoredDiagnostic, owner: Owner): DiagnosticView {
  const pending = stored.turns.find((t) => t.answer === null);
  return {
    id: stored.id,
    status: stored.status === "abandoned" ? "in_progress" : stored.status,
    answered: stored.answered,
    minTurns: MIN_TURNS,
    maxTurns: MAX_TURNS,
    progress: stored.status === "in_progress" ? completeness(stored.state) : 100,
    transcript: stored.turns
      .filter((t) => t.answer)
      .map((t) => ({ question: t.question.prompt, answer: t.answer!.text })),
    current: stored.status === "in_progress" ? (pending?.question ?? null) : null,
    insights: stored.state.insights.slice(-6),
    dimensions: DIMENSIONS.map((d) => ({
      key: d,
      label: DIMENSION_LABELS[d],
      confidence: stored.state.slots[d]?.confidence ?? 0,
    })),
    portrait: stored.portrait ? stripSource(stored.portrait) : null,
    correctionsLeft: Math.max(0, MAX_CORRECTIONS - stored.state.corrections.length),
    isAnonymous: owner.kind === "anon",
  };
}

const stripSource = (p: NonNullable<StoredDiagnostic["portrait"]>): NonNullable<DiagnosticView["portrait"]> => ({
  headline: p.headline,
  summary: p.summary,
  strengths: p.strengths,
  drivers: p.drivers,
  watchouts: p.watchouts,
  directions: p.directions,
});

const history = (stored: StoredDiagnostic): HistoryItem[] =>
  stored.turns.filter((t) => t.answer).map((t) => ({ question: t.question, answer: t.answer!.text }));

async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

async function limited(key: string, rule: { window: number; max: number }) {
  const verdict = await consume(key, rule);
  return verdict.allowed ? null : "Tu vas un peu vite. Patiente quelques secondes puis réessaie.";
}

// ---------------------------------------------------------------- Cas d'usage

export async function startDiagnostic(): Promise<ActionResult> {
  const viewer = await currentViewer({ createAnonymous: true });
  if (!viewer) return { ok: false, error: "Session introuvable." };

  const tooFast =
    (await limited(`diag-start:ip:${await clientIp()}`, limits.diagnosticStart)) ??
    (await limited(`diag-start:${rateKey(viewer)}`, limits.diagnosticStart));
  if (tooFast) return { ok: false, error: tooFast };

  const state = emptyProfile();
  await createDiagnostic(viewer.owner, { state, first: openingQuestion(state), promptVersion: PROMPT_VERSION });
  return reload(viewer.owner);
}

export async function submitAnswer(input: { diagnosticId: string; turn: number; answer: unknown }): Promise<ActionResult> {
  const viewer = await currentViewer({ createAnonymous: false });
  if (!viewer) return { ok: false, error: "Ta session a expiré. Recharge la page pour recommencer." };

  const tooFast = await limited(`diag-turn:${rateKey(viewer)}`, limits.diagnosticTurn);
  if (tooFast) return { ok: false, error: tooFast };

  const parsed = answerSchema.safeParse(input.answer);
  if (!parsed.success) return { ok: false, error: "Réponse invalide." };

  const stored = await getLatestDiagnostic(viewer.owner);
  if (!stored || stored.id !== input.diagnosticId || stored.status !== "in_progress") {
    return { ok: false, error: "Cet entretien n'est plus actif. Recharge la page." };
  }
  const pending = stored.turns.find((t) => t.answer === null);
  if (!pending || pending.turn !== input.turn) return reload(viewer.owner); // déjà répondu ailleurs

  const invalid = validateAnswer(pending.question, parsed.data);
  if (invalid) return { ok: false, error: invalid };

  const text = answerToText(pending.question, parsed.data);
  const fullHistory = [...history(stored), { question: pending.question, answer: text }];
  const result = await nextTurn({
    state: stored.state,
    history: fullHistory,
    lastAnswer: parsed.data,
    generate: ai.generate,
    userId: viewer.userId,
  });

  const portrait = result.next
    ? null
    : await buildPortrait({ state: result.state, history: fullHistory, generate: ai.generate, userId: viewer.userId });

  try {
    await recordTurn(viewer.owner, {
      diagnosticId: stored.id,
      turn: pending.turn,
      answer: { answer: parsed.data, text },
      state: result.state,
      next: result.next,
      portrait,
    });
  } catch (error) {
    if (!(error instanceof ConcurrentAnswerError)) throw error;
  }
  return reload(viewer.owner);
}

export async function correctPortrait(input: { diagnosticId: string; correction: string }): Promise<ActionResult> {
  const viewer = await currentViewer({ createAnonymous: false });
  if (!viewer) return { ok: false, error: "Ta session a expiré." };

  const correction = input.correction.trim().slice(0, 600);
  if (correction.length < 3) return { ok: false, error: "Dis-moi en quelques mots ce qui ne te ressemble pas." };

  const tooFast = await limited(`diag-portrait:${rateKey(viewer)}`, limits.aiGeneration);
  if (tooFast) return { ok: false, error: tooFast };

  const stored = await getLatestDiagnostic(viewer.owner);
  if (!stored || stored.id !== input.diagnosticId || stored.status !== "portrait_ready") {
    return { ok: false, error: "Ce portrait n'est plus modifiable." };
  }
  if (stored.state.corrections.length >= MAX_CORRECTIONS) {
    return { ok: false, error: "Tu as atteint le nombre de corrections possibles. Tu pourras affiner ton profil plus tard." };
  }

  const state = { ...stored.state, corrections: [...stored.state.corrections, correction] };
  const portrait = await buildPortrait({ state, history: history(stored), generate: ai.generate, userId: viewer.userId });
  await updatePortrait(viewer.owner, stored.id, state, portrait);
  return reload(viewer.owner);
}

export async function validatePortrait(input: { diagnosticId: string }): Promise<ActionResult> {
  const viewer = await currentViewer({ createAnonymous: false });
  if (!viewer) return { ok: false, error: "Ta session a expiré." };
  const stored = await getLatestDiagnostic(viewer.owner);
  if (!stored || stored.id !== input.diagnosticId) return { ok: false, error: "Portrait introuvable." };
  await completeDiagnostic(viewer.owner, stored.id, stored.state);
  return reload(viewer.owner);
}

async function reload(owner: Owner): Promise<ActionResult> {
  const stored = await getLatestDiagnostic(owner);
  return stored ? { ok: true, view: toView(stored, owner) } : { ok: false, error: "Entretien introuvable." };
}
