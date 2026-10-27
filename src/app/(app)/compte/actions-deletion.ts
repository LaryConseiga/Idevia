"use server";

import { revalidatePath } from "next/cache";
import { cancelDeletion, requestDeletion } from "@/server/dal/account";
import { requireUser } from "@/server/dal/session";
import { sendEmail } from "@/server/email/send";
import { emails } from "@/server/email/templates";
import { env } from "@/server/env";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export async function requestDeletionAction(confirmation: string): Promise<{ ok: boolean; error?: string }> {
  if (confirmation.trim().toUpperCase() !== "SUPPRIMER") return { ok: false, error: "Écris SUPPRIMER pour confirmer." };
  const user = await requireUser();
  const scheduledFor = await requestDeletion(user.id);
  // L'email de confirmation n'est pas bloquant : la demande est enregistrée même s'il ne part pas.
  await sendEmail({
    to: user.email,
    ...emails.deletionScheduled({ date: dateFormat.format(scheduledFor), cancelUrl: `${env.APP_URL}/compte/suppression` }),
  }).catch(() => {});
  revalidatePath("/compte");
  revalidatePath("/compte/suppression");
  return { ok: true };
}

export async function cancelDeletionAction(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await cancelDeletion(user.id);
  revalidatePath("/compte");
  revalidatePath("/compte/suppression");
  return { ok: true };
}
