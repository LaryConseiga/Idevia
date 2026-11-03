import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/env", () => ({ env: { DATA_ENCRYPTION_KEYS: "v1:" + randomBytes(32).toString("base64") } }));

const { decryptWith, encryptWith, isSealed, parseKeyring, pseudonym, seal, unseal, unsealOrNull } = await import("@/server/crypto");

const key = () => randomBytes(32).toString("base64");

describe("chiffrement des champs sensibles", () => {
  const ring = parseKeyring(`v1:${key()}`);

  it("chiffre puis déchiffre à l'identique, y compris les accents", () => {
    const text = "Je veux lancer une activité de jus de bissap à Ouagadougou — budget 150 000 FCFA";
    expect(decryptWith(ring, encryptWith(ring, text))).toBe(text);
  });

  it("produit un chiffré différent à chaque appel (IV aléatoire)", () => {
    expect(encryptWith(ring, "x")).not.toBe(encryptWith(ring, "x"));
  });

  it("rejette un chiffré altéré", () => {
    const [v, iv, tag, data] = encryptWith(ring, "secret").split(".");
    const tampered = [v, iv, tag, Buffer.from("autre").toString("base64url") + data].join(".");
    expect(() => decryptWith(ring, tampered)).toThrow();
  });

  it("lit les anciennes versions après rotation et chiffre avec la plus récente", () => {
    const v1 = `v1:${key()}`;
    const old = parseKeyring(v1);
    const rotated = parseKeyring(`${v1},v2:${key()}`);
    const legacy = encryptWith(old, "ancien");
    expect(decryptWith(rotated, legacy)).toBe("ancien");
    expect(encryptWith(rotated, "nouveau").startsWith("v2.")).toBe(true);
  });

  it("refuse une clé de mauvaise taille", () => {
    expect(() => parseKeyring(`v1:${randomBytes(16).toString("base64")}`)).toThrow();
  });
});

describe("colonnes devenues chiffrées et pseudonymes", () => {
  it("reconnaît un texte chiffré, jamais un texte ordinaire qui lui ressemble", () => {
    expect(isSealed(seal("Repas du midi livrés aux bureaux"))).toBe(true);
    for (const text of ["v1.2 du plan", "Étape 1. Préparer. Vendre.", "v1.abc.def.ghi", ""]) expect(isSealed(text)).toBe(false);
  });

  it("lit le nouveau format comme l'ancien, le temps du rechiffrement", () => {
    expect(unseal(seal("Ta première action"))).toBe("Ta première action");
    expect(unseal("Ancien titre en clair")).toBe("Ancien titre en clair");
    expect(unsealOrNull(null)).toBeNull();
  });

  it("donne un pseudonyme stable, différent pour chaque identifiant, sans laisser voir l'adresse", () => {
    expect(pseudonym("203.0.113.7")).toBe(pseudonym("203.0.113.7"));
    expect(pseudonym("203.0.113.7")).not.toBe(pseudonym("203.0.113.8"));
    expect(pseudonym("203.0.113.7")).not.toMatch(/[.:]/);
  });
});
