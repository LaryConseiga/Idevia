import "server-only";

/** Gabarits d'emails transactionnels, en HTML simple compatible avec tous les clients mail. */

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Footer = { text: string; link?: { label: string; url: string } };

const DEFAULT_FOOTER: Footer = { text: "Tu reçois cet email suite à une action sur ton compte Idevia." };

function layout(title: string, intro: string, cta: { label: string; url: string }, outro: string, footer: Footer = DEFAULT_FOOTER) {
  const footerLink = footer.link
    ? ` <a href="${escape(footer.link.url)}" style="color:#57534E">${escape(footer.link.label)}</a>`
    : "";
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#FFFBF5;font-family:Arial,Helvetica,sans-serif;color:#1C1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#FFFFFF;border:1px solid #E7DFD3;border-radius:16px">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0B5D46">Idevia</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escape(title)}</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6">${escape(intro)}</p>
<a href="${escape(cta.url)}" style="display:inline-block;background:#C2410C;color:#FFFFFF;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:12px">${escape(cta.label)}</a>
<p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#57534E">${escape(outro)}</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#57534E">${escape(footer.text)}${footerLink}</p>
</td></tr></table></body></html>`;
  const text = `${title}\n\n${intro}\n\n${cta.label} : ${cta.url}\n\n${outro}\n\n${footer.text}${footer.link ? ` ${footer.link.label} : ${footer.link.url}` : ""}`;
  return { html, text };
}

export const emails = {
  verify: (url: string) => ({
    subject: "Confirme ton adresse email",
    ...layout(
      "Bienvenue sur Idevia",
      "Confirme ton adresse pour sauvegarder ton diagnostic et retrouver ton projet sur tous tes appareils.",
      { label: "Confirmer mon email", url },
      "Ce lien expire dans 24 heures. Si tu n'as pas créé de compte, ignore cet email.",
    ),
  }),
  magicLink: (url: string) => ({
    subject: "Ton lien de connexion Idevia",
    ...layout(
      "Connexion à Idevia",
      "Clique sur le bouton pour te connecter. Pas besoin de mot de passe.",
      { label: "Me connecter", url },
      "Ce lien expire dans 10 minutes et ne fonctionne qu'une fois. Si tu n'as rien demandé, ignore cet email.",
    ),
  }),
  resetPassword: (url: string) => ({
    subject: "Réinitialise ton mot de passe",
    ...layout(
      "Nouveau mot de passe",
      "Tu as demandé à réinitialiser ton mot de passe Idevia.",
      { label: "Choisir un nouveau mot de passe", url },
      "Ce lien expire dans 1 heure. Si tu n'es pas à l'origine de la demande, ignore cet email : ton mot de passe reste inchangé.",
    ),
  }),
  reminder: (input: { firstName: string; task: string; due: string; overdue: boolean; projectUrl: string; unsubscribeUrl: string }) => ({
    subject: input.overdue ? `On reprend ? « ${input.task} » t'attend` : `Ton étape du moment : « ${input.task} »`,
    ...layout(
      input.overdue ? `${input.firstName}, on reprend ton plan ?` : `${input.firstName}, ta prochaine étape t'attend`,
      input.overdue
        ? `L'étape « ${input.task} » était prévue pour le ${input.due}. Pas de souci : un petit pas aujourd'hui suffit pour relancer ton projet.`
        : `L'étape « ${input.task} » est prévue pour le ${input.due}. Ouvre ton plan pour voir exactement quoi faire.`,
      { label: "Ouvrir mon projet", url: input.projectUrl },
      "Tu bloques ? Ton coach peut découper l'étape avec toi en un premier pas de moins de 30 minutes.",
      {
        text: "Tu reçois ce rappel parce que tu suis ton plan sur Idevia.",
        link: { label: "Ne plus recevoir de rappels", url: input.unsubscribeUrl },
      },
    ),
  }),
};
