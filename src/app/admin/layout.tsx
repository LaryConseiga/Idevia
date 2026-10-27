import type { Metadata } from "next";
import { connection } from "next/server";
import { Logo } from "@/components/logo";
import type { AdminRole } from "@/server/auth";
import { requireAdmin } from "@/server/dal/session";
import { AdminNav } from "./admin-nav";

/** Onglets visibles selon le rôle (chaque page revérifie son propre accès). */
const SECTIONS: { href: string; label: string; roles: AdminRole[] }[] = [
  { href: "/admin", label: "Vue d'ensemble", roles: ["super_admin", "support", "content", "analyst"] },
  { href: "/admin/utilisateurs", label: "Utilisateurs", roles: ["super_admin", "support"] },
  { href: "/admin/blog", label: "Blog", roles: ["super_admin", "content"] },
  { href: "/admin/journal", label: "Journal", roles: ["super_admin"] },
];

export const instant = false;
export const metadata: Metadata = { title: { default: "Administration", template: "%s · Admin Idevia" }, robots: { index: false } };

/** Toute page /admin passe par requireAdmin : rôle autorisé + 2FA active, sinon 404. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await connection();
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">Admin</span>
          </div>
          <span className="text-sm text-muted-foreground">{admin.role}</span>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AdminNav items={SECTIONS.filter((s) => s.roles.includes(admin.role)).map(({ href, label }) => ({ href, label }))} />
        </div>
      </header>
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
