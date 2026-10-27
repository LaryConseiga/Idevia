import type { Plan } from "@/server/dal/profile";

/**
 * Offre payante : un compte gratuit voit en entier la 3e idée (la moins pertinente) ;
 * les deux meilleures et le suivi sont réservés à l'offre Pro. Tout est visible tant que l'offre est désactivée.
 */
export function isLocked(rank: number, plan: Plan, paywall: "on" | "off"): boolean {
  return paywall === "on" && plan !== "pro" && rank < 3;
}
