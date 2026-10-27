import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/dal/session";
import { claimFromCookie } from "@/server/diagnostic/service";

/** Après inscription ou connexion : rattache au compte l'entretien commencé sans compte. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/connexion?suivant=/diagnostic", request.url));
  await claimFromCookie(user.id);
  return NextResponse.redirect(new URL("/diagnostic", request.url));
}
