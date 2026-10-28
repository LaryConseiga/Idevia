import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/dal/session";
import { claimFromCookie } from "@/server/diagnostic/service";
import { getIdeasState, requestIdeas } from "@/server/ideas/service";

/**
 * Juste après l'inscription (ou la connexion) : rattache au compte l'entretien fait sans compte, puis, s'il est
 * terminé, lance la génération des idées et emmène directement la personne vers ses 3 idées.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/connexion?suivant=/diagnostic/rattacher", request.url));
  await claimFromCookie(user.id);
  const ideas = await getIdeasState(user.id);
  if (ideas.status === "no_diagnostic") return NextResponse.redirect(new URL("/diagnostic", request.url));
  if (ideas.status === "none") await requestIdeas(user.id);
  return NextResponse.redirect(new URL("/idees", request.url));
}
