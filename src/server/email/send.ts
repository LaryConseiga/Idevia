import "server-only";
import { Resend } from "resend";
import { env, isProd } from "@/server/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

type Mail = { to: string; subject: string; html: string; text: string };

export async function sendEmail(mail: Mail) {
  if (!resend) {
    if (isProd) throw new Error("RESEND_API_KEY manquante : impossible d'envoyer des emails en production.");
    // Développement uniquement : le contenu (liens inclus) est affiché dans la console locale.
    console.info(`\n[email:dev] → ${mail.to}\nSujet : ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, ...mail });
  // Le message d'erreur du fournisseur peut contenir l'adresse : on ne journalise que le code.
  if (error) throw new Error(`Envoi d'email échoué (${error.name})`);
}
