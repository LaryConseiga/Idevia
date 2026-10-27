import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";

/**
 * Lien de désabonnement signé : il suffit d'un clic, sans connexion, et personne ne peut désabonner quelqu'un d'autre.
 * La clé est dérivée du secret d'authentification, avec un contexte propre à cet usage.
 */

const key = () => createHmac("sha256", env.BETTER_AUTH_SECRET).update("idevia:unsubscribe:v1").digest();

export const unsubscribeToken = (userId: string) => createHmac("sha256", key()).update(userId).digest("base64url");

export function verifyUnsubscribe(userId: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(userId));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export const unsubscribeUrl = (userId: string) =>
  `${env.APP_URL}/api/email/rappels?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
