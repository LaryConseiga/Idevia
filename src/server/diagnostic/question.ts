import { z } from "zod";
import { DIMENSIONS, type Dimension } from "./profile";

/**
 * Question posée à l'utilisateur. Qu'elle vienne du modèle ou de la banque de secours,
 * elle passe par `normalizeQuestion` avant d'être affichée.
 */

export const UNSURE = { value: "unsure", label: "Je ne sais pas encore" } as const;

export const questionKinds = ["single", "multi", "scale", "text"] as const;
export type QuestionKind = (typeof questionKinds)[number];

export type Option = { value: string; label: string };

export type Question = {
  id: string;
  intent: Dimension | "clarify" | "deepen";
  prompt: string;
  kind: QuestionKind;
  options: Option[];
  /** single/multi : champ libre « autre » en complément des options. */
  allowOther: boolean;
  scale: { min: string; max: string } | null;
  placeholder: string | null;
  /** « Je te demande ça parce que… » : transparence sur l'intention. */
  why: string | null;
};

/** Forme attendue du modèle : volontairement tolérante, normalisée ensuite. */
export const rawQuestionSchema = z.object({
  intent: z.string().catch("deepen"),
  prompt: z.string().trim().min(8).max(400),
  kind: z.enum(questionKinds).catch("text"),
  options: z
    .array(z.union([z.string(), z.object({ label: z.string(), value: z.string().optional() })]))
    .nullish()
    .catch(null),
  allowOther: z.boolean().nullish().catch(null),
  scale: z.object({ min: z.string(), max: z.string() }).nullish().catch(null),
  placeholder: z.string().nullish().catch(null),
  why: z.string().nullish().catch(null),
});

export type RawQuestion = z.infer<typeof rawQuestionSchema>;

/**
 * Sujets que l'on ne demande jamais : ils sont inutiles pour proposer une idée de business
 * et sensibles (RGPD art. 9). On vise les questions sur la personne, pas les secteurs
 * (« vêtements pour enfants » ou « santé et bien-être » restent permis).
 */
const FORBIDDEN = [
  /quel\s+âge/i,
  /\b(ton|ta|tes|votre|vos)\s+(âge|date de naissance|religion|confession|ethnie|origine ethnique|tribu|orientation sexuelle|état de santé|santé|maladie|handicap|situation (familiale|matrimoniale)|opinions? politiques?|parti politique|casier)\b/i,
  /\b(es-tu|êtes-vous|tu es|vous êtes)\s+(marié|mariée|enceinte|malade|croyant|croyante|musulman|musulmane|chrétien|chrétienne|handicapé|handicapée)/i,
  /\bcombien\s+(gagnes-tu|gagnez-vous|tu gagnes|vous gagnez)\b/i,
  /\b(ton|votre)\s+(salaire|revenu)\s+(exact|actuel|mensuel)/i,
  /\b(numéro de téléphone|adresse (e-?mail|postale|exacte)|pièce d'identité|numéro de compte|mot de passe)\b/i,
];

export const isForbidden = (text: string) => FORBIDDEN.some((re) => re.test(text));

const clip = (value: string | null | undefined, max: number) => {
  const clean = value?.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : null;
};

const slug = (label: string, index: number) =>
  `o${index + 1}-${label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24)}`;

const isUnsureLabel = (label: string) => /je ne sais pas|aucune idée|pas encore/i.test(label);

/**
 * Applique les règles serveur : bornes de longueur, 2 à 7 options, « Je ne sais pas encore » toujours présent,
 * sujets interdits. Renvoie `null` si la question est inutilisable (le moteur passe alors au repli).
 */
export function normalizeQuestion(raw: RawQuestion, id: string): Question | null {
  const prompt = clip(raw.prompt, 280);
  if (!prompt) return null;

  const intent = (DIMENSIONS as string[]).includes(raw.intent) || raw.intent === "clarify" ? raw.intent : "deepen";

  let kind = raw.kind;
  let options: Option[] = [];
  if (kind === "single" || kind === "multi") {
    const labels = (raw.options ?? [])
      .map((o) => clip(typeof o === "string" ? o : o.label, 80))
      .filter((l): l is string => Boolean(l) && !isUnsureLabel(l as string));
    options = [...new Set(labels)].slice(0, 6).map((label, i) => ({ value: slug(label, i), label }));
    if (options.length < 2) kind = "text";
    else options.push({ ...UNSURE });
  }
  if (kind !== "single" && kind !== "multi") options = [];

  const scale =
    kind === "scale"
      ? { min: clip(raw.scale?.min, 40) ?? "Pas du tout", max: clip(raw.scale?.max, 40) ?? "Tout à fait" }
      : null;

  const question: Question = {
    id,
    intent: intent as Question["intent"],
    prompt,
    kind,
    options,
    allowOther: (kind === "single" || kind === "multi") && raw.allowOther !== false,
    scale,
    placeholder: kind === "text" ? clip(raw.placeholder, 120) : null,
    why: clip(raw.why, 180),
  };

  const visible = [question.prompt, question.why ?? "", ...question.options.map((o) => o.label)].join(" ");
  return isForbidden(visible) ? null : question;
}

// ---------------------------------------------------------------- Réponses

export const MAX_ANSWER_LENGTH = 800;

export const answerSchema = z.object({
  choices: z.array(z.string().max(64)).max(8).default([]),
  text: z
    .string()
    .max(MAX_ANSWER_LENGTH)
    .transform((s) => s.trim())
    .default(""),
  scale: z.number().int().min(1).max(5).nullable().default(null),
});

export type Answer = z.infer<typeof answerSchema>;

/** Vérifie la réponse par rapport à la question réellement posée (pas de valeur inventée côté client). */
export function validateAnswer(question: Question, answer: Answer): string | null {
  const allowed = new Set(question.options.map((o) => o.value));
  if (answer.choices.some((c) => !allowed.has(c))) return "Choix invalide.";

  switch (question.kind) {
    case "single":
      if (answer.choices.length > 1) return "Un seul choix possible.";
      if (answer.choices.length === 0 && !answer.text) return "Choisis une réponse.";
      return null;
    case "multi":
      if (answer.choices.length === 0 && !answer.text) return "Choisis au moins une réponse.";
      return null;
    case "scale":
      return answer.scale === null ? "Choisis une valeur." : null;
    case "text":
      return answer.text.length < 2 ? "Écris quelques mots." : null;
  }
}

/** Réponse en langage naturel, telle qu'elle est montrée au modèle et dans l'historique. */
export function answerToText(question: Question, answer: Answer): string {
  const labels = answer.choices.map((c) => question.options.find((o) => o.value === c)?.label ?? c);
  const parts = [...labels];
  if (question.kind === "scale" && answer.scale !== null) {
    parts.push(`${answer.scale}/5 (1 = ${question.scale?.min}, 5 = ${question.scale?.max})`);
  }
  if (answer.text) parts.push(question.kind === "text" ? answer.text : `Précision : ${answer.text}`);
  return parts.join(" ; ");
}
