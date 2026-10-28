"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/dal/session";
import { FEEDBACK_MAX, refineProjectIdea, requestFieldCheck, toggleTask, updateHypothesis, type ActionResult, type RefineResult } from "@/server/projects/service";

/** Toujours l'utilisateur de la session ; aucun identifiant d'utilisateur ne vient du client. */

function refresh() {
  revalidatePath("/tableau-de-bord");
  revalidatePath("/mon-idee");
}

export async function toggleTaskAction(taskId: string, done: boolean): Promise<ActionResult> {
  const parsed = z.object({ taskId: z.uuid(), done: z.boolean() }).safeParse({ taskId, done });
  if (!parsed.success) return { ok: false, error: "Tâche introuvable." };
  const user = await requireUser();
  const result = await toggleTask(user.id, parsed.data.taskId, parsed.data.done);
  if (result.ok) refresh();
  return result;
}

export async function hypothesisAction(id: string, status: string): Promise<ActionResult> {
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(["untested", "testing", "confirmed", "invalidated"]) })
    .safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Hypothèse introuvable." };
  const user = await requireUser();
  const result = await updateHypothesis(user.id, parsed.data.id, parsed.data.status);
  if (result.ok) refresh();
  return result;
}

export async function fieldCheckAction(): Promise<ActionResult> {
  const user = await requireUser();
  const result = await requestFieldCheck(user.id);
  if (result.ok) refresh();
  return result;
}

export async function refineIdeaAction(feedback: string): Promise<RefineResult> {
  const parsed = z.string().max(FEEDBACK_MAX * 2).safeParse(feedback);
  if (!parsed.success) return { ok: false, error: "Ton message est trop long." };
  const user = await requireUser();
  const result = await refineProjectIdea(user.id, parsed.data);
  if (result.ok) {
    refresh();
    revalidatePath("/idees");
  }
  return result;
}
