"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/dal/session";
import { joinProWaitlist } from "@/server/dal/waitlist";
import { BATCH_REACTION, IDEA_REACTIONS, REACTION_COMMENT_MAX } from "@/lib/idea-reactions";
import { chooseIdea, reactToIdeas, requestIdeas, type RequestResult } from "@/server/ideas/service";

/** Toujours l'utilisateur de la session ; aucun identifiant d'utilisateur ne vient du client. */

export async function generateIdeasAction(): Promise<RequestResult> {
  const user = await requireUser();
  const result = await requestIdeas(user.id);
  if (result.ok) revalidatePath("/idees");
  return result;
}

export async function chooseIdeaAction(ideaId: string): Promise<RequestResult> {
  const parsed = z.uuid().safeParse(ideaId);
  if (!parsed.success) return { ok: false, error: "Idée introuvable." };
  const user = await requireUser();
  const result = await chooseIdea(user.id, parsed.data);
  if (result.ok) {
    revalidatePath("/idees");
    revalidatePath("/mon-idee");
    revalidatePath("/tableau-de-bord");
  }
  return result;
}

export async function joinWaitlistAction(): Promise<RequestResult> {
  const user = await requireUser();
  await joinProWaitlist(user.id);
  return { ok: true };
}

const reactionSchema = z
  .object({
    ideaId: z.uuid().nullable(),
    reason: z.enum([...IDEA_REACTIONS, BATCH_REACTION]),
    comment: z
      .string()
      .trim()
      .max(REACTION_COMMENT_MAX)
      .nullable()
      .transform((s) => s || null),
  })
  // « Aucune de ces idées » vise tout le lot ; les autres réactions, une idée précise.
  .refine((r) => (r.reason === BATCH_REACTION) === (r.ideaId === null));

export async function reactAction(input: { ideaId: string | null; reason: string; comment: string | null }): Promise<RequestResult> {
  const parsed = reactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Réaction invalide." };
  const user = await requireUser();
  const result = await reactToIdeas(user.id, parsed.data);
  if (result.ok) revalidatePath("/idees", "layout");
  return result;
}
