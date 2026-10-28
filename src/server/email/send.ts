import "server-only";
import { Resend } from "resend";
import { env, isProd } from "@/server/env";

/**
 * Envoi des emails, par ordre de priorité :
 * - en local, un compte SMTP ordinaire (Gmail…) s'il est configuré, pour tester avec de vraies boîtes ;
 * - Resend (production, avec un domaine vérifié) ;
 * - sinon, en développement, le contenu est affiché dans la console.
 */

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const smtpConfigured = !isProd && Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
const from = env.EMAIL_FROM ?? (smtpConfigured ? `Idevia <${env.SMTP_USER}>` : "Idevia <onboarding@resend.dev>");

type Mail = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

// nodemailer n'est qu'une dépendance de développement : chargé à la demande, jamais embarqué en production.
let transport: Promise<{ sendMail: (message: object) => Promise<unknown> }> | null = null;
function smtp() {
  transport ??= import("nodemailer").then(({ default: nodemailer }) =>
    nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    }),
  );
  return transport;
}

export async function sendEmail(mail: Mail) {
  if (smtpConfigured) {
    try {
      await (await smtp()).sendMail({ from, ...mail });
      return;
    } catch (error) {
      // Le message d'erreur du serveur peut contenir l'adresse : on ne journalise que le code.
      const code = error instanceof Error && "code" in error ? String(error.code) : "inconnu";
      throw new Error(`Envoi d'email échoué (SMTP ${code})`);
    }
  }
  if (!resend) {
    if (isProd) throw new Error("RESEND_API_KEY manquante : impossible d'envoyer des emails en production.");
    // Développement uniquement : le contenu (liens inclus) est affiché dans la console locale.
    console.info(`\n[email:dev] → ${mail.to}\nSujet : ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const { error } = await resend.emails.send({ from, ...(env.CONTACT_EMAIL && { replyTo: env.CONTACT_EMAIL }), ...mail });
  if (error) throw new Error(`Envoi d'email échoué (${error.name})`);
}
