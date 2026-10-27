"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/dal/session";
import { joinProWaitlist } from "@/server/dal/waitlist";
import { chooseIdea, requestIdeas, type RequestResult } from "@/server/ideas/service";

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
    revalidatePath("/tableau-de-bord");
  }
  return result;
}

export async function joinWaitlistAction(): Promise<RequestResult> {
  const user = await requireUser();
  await joinProWaitlist(user.id);
  return { ok: true };
}
