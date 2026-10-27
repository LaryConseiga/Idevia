import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { purgeExpiredDiagnostics } from "@/server/dal/diagnostics";
import { env } from "@/server/env";

/** Purge quotidienne des données expirées (Vercel Cron envoie « Authorization: Bearer CRON_SECRET »). */
export async function GET(request: NextRequest) {
  const expected = env.CRON_SECRET ? Buffer.from(`Bearer ${env.CRON_SECRET}`) : null;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (!expected || received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const diagnostics = await purgeExpiredDiagnostics();
  return NextResponse.json({ diagnostics });
}
