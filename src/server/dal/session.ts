import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ADMIN_ROLES, auth, type AdminRole } from "@/server/auth";

/** Utilisateur exposé au reste de l'application : volontairement réduit. */
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  twoFactorEnabled: boolean;
};

/** Lit la session une seule fois par requête. Doit être appelée sous un <Suspense>. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.banned) return null;
  const { id, name, email, role, twoFactorEnabled } = session.user;
  return { id, name, email, role: role ?? "user", twoFactorEnabled: Boolean(twoFactorEnabled) };
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/connexion?suivant=${encodeURIComponent(next)}` : "/connexion");
  return user;
}

export const isAdminRole = (role: string): role is AdminRole => (ADMIN_ROLES as readonly string[]).includes(role);

/**
 * Accès à l'administration : rôle autorisé ET double authentification active.
 * Un utilisateur ordinaire reçoit une 404 (on ne révèle pas l'existence de l'espace).
 */
export async function requireAdmin(allowed: readonly AdminRole[] = ADMIN_ROLES): Promise<CurrentUser & { role: AdminRole }> {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) notFound();
  if (!user.twoFactorEnabled) redirect("/compte/securite?raison=2fa-admin");
  if (user.role !== "super_admin" && !allowed.includes(user.role)) notFound();
  return user as CurrentUser & { role: AdminRole };
}
