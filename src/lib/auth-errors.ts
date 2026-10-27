/** Messages d'erreur d'authentification en français, sans révéler si un compte existe. */
const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  INVALID_PASSWORD: "Email ou mot de passe incorrect.",
  INVALID_EMAIL: "Cette adresse email n'est pas valide.",
  EMAIL_NOT_VERIFIED:
    "Confirme d'abord ton adresse : nous venons de te renvoyer un email de vérification.",
  PASSWORD_TOO_SHORT: "Ton mot de passe doit contenir au moins 10 caractères.",
  PASSWORD_TOO_LONG: "Ton mot de passe est trop long (128 caractères maximum).",
  PASSWORD_COMPROMISED: "Ce mot de passe apparaît dans des fuites de données connues. Choisis-en un autre.",
  USER_ALREADY_EXISTS: "Impossible de créer ce compte. Si tu en as déjà un, connecte-toi.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Impossible de créer ce compte. Si tu en as déjà un, connecte-toi.",
  INVALID_TOKEN: "Ce lien n'est plus valide. Fais une nouvelle demande.",
  TOKEN_EXPIRED: "Ce lien a expiré. Fais une nouvelle demande.",
  INVALID_CODE: "Code incorrect. Vérifie l'heure de ton téléphone et réessaie.",
  INVALID_TWO_FACTOR_CODE: "Code incorrect. Vérifie l'heure de ton téléphone et réessaie.",
  INVALID_BACKUP_CODE: "Code de secours incorrect.",
  SESSION_NOT_FRESH: "Par sécurité, reconnecte-toi avant cette action.",
  BANNED_USER: "Ce compte est suspendu. Si tu penses que c'est une erreur, écris-nous depuis la page Contact.",
};

export function authErrorMessage(error: { code?: string; status?: number; message?: string } | null | undefined) {
  if (!error) return "Une erreur est survenue. Réessaie dans un instant.";
  if (error.status === 429) return "Trop de tentatives. Patiente quelques minutes avant de réessayer.";
  if (error.code && messages[error.code]) return messages[error.code];
  if (error.message?.toLowerCase().includes("compromised")) return messages.PASSWORD_COMPROMISED;
  return "Une erreur est survenue. Réessaie dans un instant.";
}

/** Empêche les redirections ouvertes : seul un chemin interne est accepté. */
export function safeNextPath(value: string | null | undefined, fallback = "/tableau-de-bord") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
