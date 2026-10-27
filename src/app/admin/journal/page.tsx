import type { Metadata } from "next";
import { listAudit } from "@/server/dal/admin";
import { requireAdmin } from "@/server/dal/session";

export const metadata: Metadata = { title: "Journal" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

const ACTIONS: Record<string, string> = {
  "user.ban": "Suspension",
  "user.unban": "Réactivation",
  "post.create": "Article créé",
  "post.update": "Article modifié",
  "post.publish": "Article publié",
  "post.delete": "Article supprimé",
};

const label = (action: string) => ACTIONS[action] ?? (action.startsWith("user.role.") ? `Rôle → ${action.slice(10)}` : action);

/** Toutes les actions d'administration, avec leur auteur et leur motif. Réservé au super administrateur. */
export default async function AuditPage() {
  await requireAdmin(["super_admin"]);
  const rows = await listAudit(200);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Journal d&apos;audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Les 200 dernières actions d&apos;administration.</p>
      </div>
      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Date</th>
              <th className="px-4 py-2.5 font-semibold">Par</th>
              <th className="px-4 py-2.5 font-semibold">Action</th>
              <th className="px-4 py-2.5 font-semibold">Cible</th>
              <th className="px-4 py-2.5 font-semibold">Motif</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Aucune action pour l&apos;instant.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-4 py-2.5 whitespace-nowrap">{dateFormat.format(r.createdAt)}</td>
                <td className="px-4 py-2.5">{r.adminEmail ?? (r.reason?.startsWith("script") ? "script serveur" : "compte supprimé")}</td>
                <td className="px-4 py-2.5 font-medium">{label(r.action)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  <code className="text-xs">{r.targetType ? `${r.targetType}:${r.targetId?.slice(0, 12)}` : "–"}</code>
                </td>
                <td className="px-4 py-2.5">{r.reason ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
