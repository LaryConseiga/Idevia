import { z } from "zod";

/**
 * Formats échangés avec les modèles. Tolérants en entrée (les modèles débordent parfois), bornés en sortie.
 */

/** Les textes sont affichés tels quels : on retire le gras et l'italique markdown que certains modèles ajoutent. */
export const stripMarkdown = (s: string) =>
  s
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(«])\*(?!\s)([^*\n]+?)\*(?=$|[\s.,;:!?)»])/g, "$1$2");

const text = (max: number, min = 1) =>
  z
    .string()
    .trim()
    .min(min)
    .transform((s) => stripMarkdown(s).slice(0, max));

// ---------------------------------------------------------------- 1. Candidates (générateurs)

export const REACHES = ["local", "national", "online", "cross_border"] as const;
export type Reach = (typeof REACHES)[number];

export const REACH_LABELS: Record<Reach, string> = {
  local: "Près de chez toi",
  national: "Dans tout ton pays",
  online: "En ligne, sans frontière",
  cross_border: "Entre deux pays",
};

export const candidateSchema = z.object({
  title: text(80, 3),
  pitch: text(300, 10),
  customer: text(200),
  offer: text(300),
  revenueModel: text(200),
  startCost: text(120),
  /** Famille de modèle économique, pour éviter de garder trois variantes de la même idée. */
  family: text(60),
  /** Où sont les clients : une idée n'est pas limitée au lieu de vie de la personne. */
  reach: z.enum(REACHES).catch("local"),
  whyFit: text(300),
});

export const candidatesSchema = z.object({
  ideas: z
    .array(candidateSchema.nullable().catch(null))
    .transform((a) => a.filter((i): i is Candidate => i !== null))
    .refine((a) => a.length >= 2, "Pas assez d'idées exploitables"),
});

export type Candidate = z.infer<typeof candidateSchema>;

// ---------------------------------------------------------------- 2. Notation (juge)

const note = z.coerce.number().min(0).max(10).catch(5);

export const CRITERIA = {
  skills: { label: "Tes compétences", weight: 0.22 },
  demand: { label: "La demande sur le marché visé", weight: 0.22 },
  resources: { label: "Ton budget et ton temps", weight: 0.2 },
  motivation: { label: "Ce qui te motive", weight: 0.14 },
  speed: { label: "Premiers revenus rapides", weight: 0.12 },
  risk: { label: "Risque maîtrisé", weight: 0.1 },
} as const;

export type Criterion = keyof typeof CRITERIA;

export const judgementSchema = z.object({
  scores: z.array(
    z.object({
      index: z.coerce.number().int().min(0),
      skills: note,
      demand: note,
      resources: note,
      motivation: note,
      speed: note,
      risk: note,
      family: z.string().trim().max(60).catch(""),
      /** Idée irréaliste, illégale, dangereuse ou hors budget : écartée quel que soit son score. */
      eliminate: z.boolean().catch(false),
      note: z.string().trim().max(300).catch(""),
    }),
  ),
});

export type Judgement = z.infer<typeof judgementSchema>["scores"][number];

// ---------------------------------------------------------------- 3. Fiche détaillée (rédacteur)

export const ideaContentSchema = z.object({
  title: text(80, 3),
  hook: text(180, 10),
  summary: text(500, 20),
  whyYou: text(900, 40),
  offer: z.object({
    what: text(300),
    forWhom: text(300),
    price: text(200),
    where: text(300),
  }),
  numbers: z.object({
    startBudget: text(120),
    timePerWeek: text(120),
    firstGoal: text(160),
  }),
  plan: z
    .array(
      z.object({
        period: text(40),
        title: text(90),
        story: text(700, 30),
        milestone: text(200),
      }),
    )
    .min(3)
    .transform((a) => a.slice(0, 6)),
  todayAction: text(300, 10),
  watchouts: z
    .array(z.object({ risk: text(160), answer: text(400) }))
    .catch([])
    .transform((a) => a.slice(0, 3)),
});

export type IdeaContent = z.infer<typeof ideaContentSchema>;

export type ScoreBreakdown = Record<Criterion, number> | null;
