"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { forgetFact, MESSAGE_MAX, resetConversation, sendCoachMessage, type SendResult } from "@/server/assistant/service";
import { requireUser } from "@/server/dal/session";

/** Toujours l'utilisateur de la session ; aucun identifiant d'utilisateur ne vient du client. */

export async function sendMessageAction(text: string): Promise<SendResult> {
  const parsed = z.string().max(MESSAGE_MAX * 2).safeParse(text);
  if (!parsed.success) return { ok: false, error: "Ton message est trop long." };
  const user = await requireUser();
  return sendCoachMessage(user.id, parsed.data);
}

export async function forgetFactAction(fact: string): Promise<{ ok: true }> {
  const parsed = z.string().max(400).safeParse(fact);
  const user = await requireUser();
  if (parsed.success) await forgetFact(user.id, parsed.data);
  revalidatePath("/assistant");
  return { ok: true };
}

export async function resetConversationAction(): Promise<{ ok: true }> {
  const user = await requireUser();
  await resetConversation(user.id);
  revalidatePath("/assistant");
  return { ok: true };
}
