import type { Metadata } from "next";
import { connection } from "next/server";
import { Logo } from "@/components/logo";
import { requireAdmin } from "@/server/dal/session";

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
      </header>
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
