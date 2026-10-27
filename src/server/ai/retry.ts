/**
 * Gemini n'envoie pas d'en-tête Retry-After mais l'écrit dans le message (« Please retry in 19h49m56s »).
 * Un quota journalier épuisé met ainsi la voie de côté jusqu'à sa remise à zéro.
 */
export function parseRetryDelay(body: string): number | null {
  const match = body.match(/retry in ((?:\d+h)?(?:\d+m)?(?:[\d.]+s)?)/i);
  if (!match?.[1]) return null;
  const [, h = "0", m = "0", sec = "0"] = match[1].match(/(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/) ?? [];
  const total = Number(h) * 3600 + Number(m) * 60 + Number(sec);
  return total > 0 ? Math.ceil(total) : null;
}
