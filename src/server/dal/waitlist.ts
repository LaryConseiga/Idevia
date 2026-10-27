import "server-only";
import { proWaitlist } from "@/server/db/schema";
import { withUser } from "./context";

/** Liste d'attente de l'offre Pro : on prévient ces comptes à son lancement. */
export function joinProWaitlist(userId: string): Promise<void> {
  return withUser(userId, async (tx) => {
    await tx.insert(proWaitlist).values({ userId }).onConflictDoNothing();
  });
}
