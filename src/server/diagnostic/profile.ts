import { z } from "zod";
import { countryByCode } from "@/lib/countries";

/**
 * Profil structuré construit au fil de l'entretien (docs/ARCHITECTURE.md §4.1).
 * Les schémas sont tolérants en entrée (le modèle peut déborder) et bornés en sortie :
 * les listes et textes trop longs sont tronqués plutôt que rejetés.
 */

const text = (max: number) =>
  z
    .string()
    .trim()
    .transform((s) => s.slice(0, max));
const list = (items: number, max = 80) =>
  z
    .array(z.string().trim().min(1))
    .transform((a) => [...new Set(a.map((s) => s.slice(0, max)))].slice(0, items))
    .default([]);

export const dimensionValues = {
  market: z.object({
    countryCode: z
      .string()
      .nullish()
      .transform((c) => countryByCode(c)?.code ?? null),
    country: text(60).nullish(),
    city: text(60).nullish(),
    /** Où sont ses clients : le lieu de vie fixe la devise et les démarches, pas les limites du marché. */
    scope: z.enum(["local", "national", "online", "cross_border", "international"]).nullish().catch(null),
  }),
  goal: z.object({
    type: z.enum(["complement", "principal", "scale", "unsure"]).nullish(),
    horizon: text(80).nullish(),
    incomeTarget: text(80).nullish(),
  }),
  skills: z.object({ items: list(12), experience: list(8, 140) }),
  interests: z.object({ sectors: list(10), excluded: list(8) }),
  resources: z.object({
    budgetRange: text(80).nullish(),
    hoursPerWeek: z.coerce.number().min(0).max(100).nullish().catch(null),
    assets: list(8, 120),
  }),
  preferences: z.object({
    channel: text(60).nullish(),
    offerType: text(60).nullish(),
    salesComfort: z.coerce.number().int().min(1).max(5).nullish().catch(null),
    workStyle: text(80).nullish(),
  }),
  constraints: z.object({ items: list(8, 140) }),
  motivations: z.object({ why: text(400).nullish(), values: list(6) }),
} as const;

export type Dimension = keyof typeof dimensionValues;
export const DIMENSIONS = Object.keys(dimensionValues) as Dimension[];

/** Dimensions indispensables pour proposer des idées pertinentes. */
export const REQUIRED: Dimension[] = ["market", "goal", "skills", "interests", "resources", "motivations"];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  market: "Ton terrain",
  goal: "Ton objectif",
  skills: "Tes compétences",
  interests: "Ce qui t'attire",
  resources: "Tes moyens",
  preferences: "Ta façon de travailler",
  constraints: "Tes contraintes",
  motivations: "Ce qui te pousse",
};

const confidence = z.coerce.number().int().min(0).max(3).catch(1);

const slotOf = <T extends z.ZodType>(value: T) =>
  z.object({ value, confidence, source: z.enum(["user", "inferred"]).catch("user") });

const slotSchemas = {
  market: slotOf(dimensionValues.market),
  goal: slotOf(dimensionValues.goal),
  skills: slotOf(dimensionValues.skills),
  interests: slotOf(dimensionValues.interests),
  resources: slotOf(dimensionValues.resources),
  preferences: slotOf(dimensionValues.preferences),
  constraints: slotOf(dimensionValues.constraints),
  motivations: slotOf(dimensionValues.motivations),
};

export type Slot<D extends Dimension> = z.infer<(typeof slotSchemas)[D]>;
export type Slots = { [D in Dimension]: Slot<D> | null };

/** Mise à jour renvoyée par le modèle : seules les dimensions qui changent ; une dimension mal formée est ignorée. */
export const slotUpdatesSchema = z.object({
  market: slotSchemas.market.nullish().catch(null),
  goal: slotSchemas.goal.nullish().catch(null),
  skills: slotSchemas.skills.nullish().catch(null),
  interests: slotSchemas.interests.nullish().catch(null),
  resources: slotSchemas.resources.nullish().catch(null),
  preferences: slotSchemas.preferences.nullish().catch(null),
  constraints: slotSchemas.constraints.nullish().catch(null),
  motivations: slotSchemas.motivations.nullish().catch(null),
});

export type SlotUpdates = z.infer<typeof slotUpdatesSchema>;

/** Réponse dont l'analyse a échoué (modèle indisponible) : retraitée au tour suivant. */
export type PendingAnswer = { question: string; answer: string; intent: string };

export type ProfileState = {
  slots: Slots;
  insights: string[];
  contradictions: string[];
  pending: PendingAnswer[];
  /** Corrections apportées par l'utilisateur au portrait : prioritaires sur tout le reste. */
  corrections: string[];
};

export function emptyProfile(): ProfileState {
  return {
    slots: Object.fromEntries(DIMENSIONS.map((d) => [d, null])) as Slots,
    insights: [],
    contradictions: [],
    pending: [],
    corrections: [],
  };
}

export const confidenceOf = (state: ProfileState, d: Dimension) => state.slots[d]?.confidence ?? 0;

export function applyUpdates(state: ProfileState, updates: SlotUpdates): ProfileState {
  const slots = { ...state.slots };
  for (const d of DIMENSIONS) {
    const update = updates[d];
    if (update) (slots as Record<Dimension, unknown>)[d] = update;
  }
  return { ...state, slots };
}

export function addInsights(state: ProfileState, insights: string[]): ProfileState {
  const merged = [...state.insights];
  for (const insight of insights) {
    const clean = insight.trim().slice(0, 160);
    if (clean && !merged.some((i) => i.toLowerCase() === clean.toLowerCase())) merged.push(clean);
  }
  return { ...state, insights: merged.slice(-12) };
}

/** Pourcentage « je te connais à X % » : les dimensions indispensables pèsent double. */
export function completeness(state: ProfileState): number {
  let got = 0;
  let total = 0;
  for (const d of DIMENSIONS) {
    const weight = REQUIRED.includes(d) ? 2 : 1;
    got += (Math.min(confidenceOf(state, d), 3) / 3) * weight;
    total += weight;
  }
  return Math.round((got / total) * 100);
}

/** Dimension à creuser en priorité : indispensable et la moins sûre, puis les autres. */
export function weakestDimension(state: ProfileState, exclude: Dimension[] = []): Dimension | null {
  const candidates = DIMENSIONS.filter((d) => !exclude.includes(d));
  const sorted = candidates.sort((a, b) => {
    const req = Number(REQUIRED.includes(b)) - Number(REQUIRED.includes(a));
    const ca = confidenceOf(state, a);
    const cb = confidenceOf(state, b);
    // Une dimension indispensable sous le seuil passe avant tout.
    const belowA = REQUIRED.includes(a) && ca < 2 ? 0 : 1;
    const belowB = REQUIRED.includes(b) && cb < 2 ? 0 : 1;
    return belowA - belowB || ca - cb || req;
  });
  const first = sorted[0];
  return first && confidenceOf(state, first) < 3 ? first : null;
}

export const requiredSatisfied = (state: ProfileState) => REQUIRED.every((d) => confidenceOf(state, d) >= 2);
