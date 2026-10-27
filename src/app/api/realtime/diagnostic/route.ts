import { z } from "zod";
import { getCurrentUser } from "@/server/dal/session";
import { realtime, sealDiagnosticProgress } from "@/server/realtime";

/**
 * Renouvelle la requête scellée (elle expire au bout de 60 s).
 * L'utilisateur vient de la session ; l'identifiant envoyé par la page doit être le même,
 * sinon la page appartient à une autre session (déconnexion ou changement de compte dans un autre onglet).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = z.object({ userId: z.string().min(1).max(64) }).safeParse(await request.json().catch(() => null));
  if (!user || !body.success || body.data.userId !== user.id) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!realtime) return Response.json({ error: "unavailable" }, { status: 503 });
  return Response.json(await sealDiagnosticProgress(user.id), { headers: { "Cache-Control": "private, no-store" } });
}
