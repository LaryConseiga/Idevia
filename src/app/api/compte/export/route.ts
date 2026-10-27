import { NextResponse } from "next/server";
import { exportUserData } from "@/server/dal/account";
import { getCurrentUser } from "@/server/dal/session";
import { consume, limits } from "@/server/ratelimit";

/** Portabilité : toutes les données du compte, en clair, dans un fichier JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const verdict = await consume(`export:${user.id}`, limits.dataExport);
  if (!verdict.allowed) {
    return NextResponse.json({ error: "Trop d'exports rapprochés. Réessaie dans une heure." }, { status: 429 });
  }
  const data = await exportUserData(user.id);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="idevia-mes-donnees-${date}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
