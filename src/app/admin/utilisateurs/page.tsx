import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { listUsers } from "@/server/dal/admin";
import { requireAdmin } from "@/server/dal/session";
import { UserActions } from "./user-actions";

export const metadata: Metadata = { title: "Utilisateurs" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** Métadonnées de compte uniquement : le contenu des diagnostics, idées et projets n'est jamais affiché ici. */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/utilisateurs">) {
  const admin = await requireAdmin(["support"]);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const page = Math.max(0, Number(params.page) || 0);
  const { rows, hasMore } = await listUsers(q, page);
  const pageHref = (p: number) => `/admin/utilisateurs?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <form className="flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">
            Rechercher par email ou prénom
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Email ou prénom"
            className="min-h-11 w-64 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <button type="submit" className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
            Rechercher
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Compte</th>
              <th className="px-4 py-2.5 font-semibold">Inscription</th>
              <th className="px-4 py-2.5 font-semibold">Parcours</th>
              <th className="px-4 py-2.5 font-semibold">Rôle</th>
              <th className="px-4 py-2.5 font-semibold">État</th>
              <th className="px-4 py-2.5 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun compte{q ? ` pour « ${q} »` : ""}.
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-border align-top">
                <td className="px-4 py-3">
                  <span className="block font-medium">{u.name}</span>
                  <span className="block text-muted-foreground">{u.email}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{dateFormat.format(u.createdAt)}</td>
                <td className="px-4 py-3">{u.stage}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      u.banned ? "bg-destructive-soft text-destructive" : u.verified ? "bg-success-soft text-success" : "bg-muted",
                    )}
                  >
                    {u.banned ? "Suspendu" : u.verified ? "Actif" : "Email non vérifié"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.id !== admin.id && <UserActions userId={u.id} banned={u.banned} role={u.role} canSetRole={admin.role === "super_admin"} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        {page > 0 && (
          <Link href={pageHref(page - 1)} className="font-medium text-primary hover:underline">
            ← Précédents
          </Link>
        )}
        {hasMore && (
          <Link href={pageHref(page + 1)} className="font-medium text-primary hover:underline">
            Suivants →
          </Link>
        )}
      </div>
    </div>
  );
}
