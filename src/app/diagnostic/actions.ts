"use server";

import { z } from "zod";
import * as service from "@/server/diagnostic/service";
import type { ActionResult } from "@/server/diagnostic/view";

/**
 * Points d'entrée publics : toute entrée est revalidée ici, la session et l'appartenance
 * sont revérifiées dans le service (jamais déduites du client).
 */

const id = z.uuid();
const invalid: ActionResult = { ok: false, error: "Requête invalide." };

async function guard(run: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await run();
  } catch (error) {
    console.error("[diagnostic]", error instanceof Error ? error.message : "erreur inconnue");
    return { ok: false, error: "Un souci technique est survenu. Ta réponse n'a pas été perdue : réessaie." };
  }
}

export async function startDiagnosticAction(): Promise<ActionResult> {
  return guard(() => service.startDiagnostic());
}

export async function submitAnswerAction(input: { diagnosticId: string; turn: number; answer: unknown }) {
  const parsed = z.object({ diagnosticId: id, turn: z.number().int().min(1).max(30), answer: z.unknown() }).safeParse(input);
  if (!parsed.success) return invalid;
  return guard(() => service.submitAnswer(parsed.data));
}

export async function correctPortraitAction(input: { diagnosticId: string; correction: string }) {
  const parsed = z.object({ diagnosticId: id, correction: z.string().max(2000) }).safeParse(input);
  if (!parsed.success) return invalid;
  return guard(() => service.correctPortrait(parsed.data));
}

export async function validatePortraitAction(input: { diagnosticId: string }) {
  const parsed = z.object({ diagnosticId: id }).safeParse(input);
  if (!parsed.success) return invalid;
  return guard(() => service.validatePortrait(parsed.data));
}
