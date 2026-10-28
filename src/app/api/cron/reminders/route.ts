import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { dueReminders, markReminded } from "@/server/dal/reminders";
import { sendEmail } from "@/server/email/send";
import { emails } from "@/server/email/templates";
import { unsubscribeUrl } from "@/server/email/unsubscribe";
import { env } from "@/server/env";
import { formatDue, runReminders } from "@/server/reminders/run";

/** Rappels quotidiens (Vercel Cron envoie « Authorization: Bearer CRON_SECRET »). */
export async function GET(request: NextRequest) {
  const expected = env.CRON_SECRET ? Buffer.from(`Bearer ${env.CRON_SECRET}`) : null;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (!expected || received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runReminders({
    select: dueReminders,
    compose: (r) => {
      const unsubscribe = unsubscribeUrl(r.userId);
      return {
        to: r.email,
        ...emails.reminder({
          firstName: r.name.split(" ")[0] || "Bonjour",
          task: r.task,
          due: formatDue(r.dueDate),
          overdue: r.overdue,
          projectUrl: `${env.APP_URL}/tableau-de-bord`,
          unsubscribeUrl: unsubscribe,
        }),
        // Désabonnement en un clic depuis la boîte mail (RFC 8058).
        headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      };
    },
    send: sendEmail,
    mark: markReminded,
  });
  return NextResponse.json(result);
}
