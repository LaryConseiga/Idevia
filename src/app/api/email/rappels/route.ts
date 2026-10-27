import { NextResponse, type NextRequest } from "next/server";
import { setEmailReminders } from "@/server/dal/reminders";
import { verifyUnsubscribe } from "@/server/email/unsubscribe";
import { env } from "@/server/env";

/**
 * Désabonnement des rappels, sans connexion : le lien est signé pour cette personne.
 * GET depuis le lien de l'email, POST depuis le bouton « Se désabonner » des messageries (RFC 8058).
 */
async function unsubscribe(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("u") ?? "";
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const valid = userId.length > 0 && userId.length <= 64 && verifyUnsubscribe(userId, token);
  if (valid) await setEmailReminders(userId, false);
  return valid;
}

export async function GET(request: NextRequest) {
  const ok = await unsubscribe(request);
  // Lien abîmé ou ancien : le réglage reste accessible depuis le compte.
  return NextResponse.redirect(new URL(ok ? "/rappels-desactives" : "/compte", env.APP_URL), 303);
}

export async function POST(request: NextRequest) {
  const ok = await unsubscribe(request);
  return new NextResponse(null, { status: ok ? 200 : 400 });
}
