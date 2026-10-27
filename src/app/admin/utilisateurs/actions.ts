"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/server/auth";
import { audit, getUserBrief } from "@/server/dal/admin";
import { requireAdmin } from "@/server/dal/session";

/**
 * Actions sur les comptes. Chacune exige un motif écrit et laisse une trace dans le journal d'audit.
 * Better Auth revérifie les droits du rôle (voir server/auth/roles.ts).
 */

export type AdminResult = { ok: true } | { ok: false; error: string };

const input = z.object({ userId: z.string().min(1).max(64), reason: z.string().trim().min(5, "Indique un motif (5 caractères au moins).").max(500) });

async function run(fn: () => Promise<unknown>): Promise<AdminResult> {
  try {
    await fn();
    revalidatePath("/admin/utilisateurs");
    return { ok: true };
  } catch (error) {
    if (error instanceof APIError) return { ok: false, error: "Action refusée pour ton rôle." };
    throw error;
  }
}

export async function banUserAction(userId: string, reason: string): Promise<AdminResult> {
  const admin = await requireAdmin(["support"]);
  const parsed = input.safeParse({ userId, reason });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.userId === admin.id) return { ok: false, error: "Tu ne peux pas suspendre ton propre compte." };
  const target = await getUserBrief(parsed.data.userId);
  if (!target) return { ok: false, error: "Compte introuvable." };
  if (target.role === "super_admin") return { ok: false, error: "Un super administrateur ne peut pas être suspendu ici." };
  return run(async () => {
    // Suspension : la personne est déconnectée partout et ne peut plus se reconnecter.
    await auth.api.banUser({ body: { userId: target.id, banReason: parsed.data.reason }, headers: await headers() });
    await audit({ adminUserId: admin.id, action: "user.ban", targetType: "user", targetId: target.id, reason: parsed.data.reason });
  });
}

export async function unbanUserAction(userId: string, reason: string): Promise<AdminResult> {
  const admin = await requireAdmin(["support"]);
  const parsed = input.safeParse({ userId, reason });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(async () => {
    await auth.api.unbanUser({ body: { userId: parsed.data.userId }, headers: await headers() });
    await audit({ adminUserId: admin.id, action: "user.unban", targetType: "user", targetId: parsed.data.userId, reason: parsed.data.reason });
  });
}

const ROLES = ["user", "support", "content", "analyst", "super_admin"] as const;

export async function setRoleAction(userId: string, role: string, reason: string): Promise<AdminResult> {
  const admin = await requireAdmin(["super_admin"]);
  const parsed = input.extend({ role: z.enum(ROLES) }).safeParse({ userId, role, reason });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.userId === admin.id) return { ok: false, error: "Tu ne peux pas changer ton propre rôle." };
  return run(async () => {
    await auth.api.setRole({ body: { userId: parsed.data.userId, role: parsed.data.role }, headers: await headers() });
    await audit({
      adminUserId: admin.id,
      action: `user.role.${parsed.data.role}`,
      targetType: "user",
      targetId: parsed.data.userId,
      reason: parsed.data.reason,
    });
  });
}
