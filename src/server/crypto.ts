import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { env } from "@/server/env";

/**
 * Chiffrement applicatif AES-256-GCM des champs sensibles.
 * Format : `<version>.<iv b64url>.<tag b64url>.<ciphertext b64url>`.
 * Rotation : ajouter une clé `v2:...` dans DATA_ENCRYPTION_KEYS ; les anciennes restent lisibles.
 */

type Keyring = { current: string; keys: Map<string, Buffer> };

export function parseKeyring(raw: string): Keyring {
  const keys = new Map<string, Buffer>();
  let current = "";
  for (const entry of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const sep = entry.indexOf(":");
    if (sep <= 0) throw new Error("DATA_ENCRYPTION_KEYS : format attendu `v1:base64key`");
    const version = entry.slice(0, sep);
    const key = Buffer.from(entry.slice(sep + 1), "base64");
    if (key.length !== 32) throw new Error(`Clé ${version} : 32 octets attendus`);
    if (!/^v\d+$/.test(version)) throw new Error(`Version de clé invalide : ${version}`);
    keys.set(version, key);
    current = version;
  }
  if (!current) throw new Error("DATA_ENCRYPTION_KEYS vide");
  return { current, keys };
}

let keyring: Keyring | undefined;
function getKeyring() {
  keyring ??= parseKeyring(env.DATA_ENCRYPTION_KEYS);
  return keyring;
}

export function encryptWith(ring: Keyring, plaintext: string): string {
  const key = ring.keys.get(ring.current)!;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ring.current, iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptWith(ring: Keyring, payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  const key = version ? ring.keys.get(version) : undefined;
  if (!key || !iv || !tag || data === undefined) throw new Error("Donnée chiffrée invalide ou clé inconnue");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export const encrypt = (plaintext: string) => encryptWith(getKeyring(), plaintext);
export const decrypt = (payload: string) => decryptWith(getKeyring(), payload);

export const encryptJson = (value: unknown) => encrypt(JSON.stringify(value));
export const decryptJson = <T>(payload: string): T => JSON.parse(decrypt(payload)) as T;

/**
 * Colonnes historiquement en clair (titres d'idées, nom du projet, étapes du plan, hypothèses), désormais chiffrées
 * sans changer de nom. `unseal` lit encore les anciennes valeurs en clair, le temps que `npm run db:seal` les chiffre.
 */
const SEALED = /^v\d+\.[\w-]{16}\.[\w-]{22}\.[\w-]*$/;
export const isSealed = (value: string) => SEALED.test(value);
export const seal = (value: string) => encrypt(value);
export const sealOrNull = (value: string | null | undefined) => (value == null ? null : encrypt(value));
export const unseal = (value: string) => (isSealed(value) ? decrypt(value) : value);
export const unsealOrNull = (value: string | null) => (value === null ? null : unseal(value));

/**
 * Pseudonyme stable et non réversible d'un identifiant (adresse IP, compte), dérivé de la clé de chiffrement :
 * sans la clé, impossible de retrouver l'IP par force brute comme avec un simple SHA-256.
 */
export function pseudonym(value: string): string {
  const ring = getKeyring();
  return createHmac("sha256", ring.keys.get(ring.current)!).update(`pseudonym:${value}`).digest("base64url").slice(0, 32);
}

/** Hachage non réversible (identifiants de session anonymes, etc.). */
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
