"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setEmailReminders } from "@/server/dal/reminders";
import { requireUser } from "@/server/dal/session";

export async function setRemindersAction(on: boolean): Promise<{ ok: boolean }> {
  const parsed = z.boolean().safeParse(on);
  if (!parsed.success) return { ok: false };
  const user = await requireUser();
  await setEmailReminders(user.id, parsed.data);
  revalidatePath("/compte");
  return { ok: true };
}
