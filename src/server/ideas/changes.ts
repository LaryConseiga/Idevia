import type { IdeaReactionReason } from "@/lib/idea-reactions";
import type { ProviderId } from "@/server/ai/types";
import type { ReserveIdea } from "./pipeline";
import type { Nature } from "./schemas";

/**
 * Changer une idée avant de la choisir (voir docs/FLUX-IDEES.md, étape 5) : la remplacer par une idée de la réserve,
 * ou l'ajuster selon la réaction de la personne. Un seul appel de rédaction à chaque fois. Module pur.
 */

/** Au-delà, la personne tourne en rond sur la même idée : mieux vaut en choisir une autre ou en générer de nouvelles. */
export const MAX_CHANGES_PER_IDEA = 2;

/** Modèles au quota large d'abord : Gemini Flash (20 requêtes par jour) reste pour les générations complètes. */
export const CHANGE_CHAIN: ProviderId[] = ["gemini_lite", "groq_reasoning", "gemini"];

/** Réactions qui se règlent en ajustant la même idée. */
export const ADJUSTABLE: readonly IdeaReactionReason[] = ["budget", "skills", "not_for_me"];
/** Réactions qui se règlent en proposant une autre idée. */
export const REPLACEABLE: readonly IdeaReactionReason[] = ["not_for_me", "budget", "skills", "domain"];

const ADJUST_REQUEST: Partial<Record<IdeaReactionReason, string>> = {
  budget:
    "Cette idée dépasse mon budget. Propose une version qui démarre avec beaucoup moins d'argent, quitte à commencer plus petit ou à vendre avant d'acheter.",
  skills:
    "Cette idée demande des compétences que je n'ai pas. Propose une version que je peux faire sans elles : confier ce point à quelqu'un, m'associer, ou apprendre l'essentiel gratuitement dans les premières étapes du plan.",
  not_for_me:
    "L'idée est intéressante, mais je ne me vois pas la faire. Rapproche-la de ce que je suis, de ce que je sais faire et de ma façon de travailler.",
};

/** Le retour envoyé au modèle : la réaction, puis la précision libre de la personne s'il y en a une. */
export function adjustmentFeedback(reason: IdeaReactionReason, comment: string | null): string | null {
  const request = ADJUST_REQUEST[reason];
  if (!request) return null;
  return comment ? `${request}\nPrécision : ${comment}` : request;
}

const family = (s: string) => s.trim().toLowerCase();

/**
 * Choisit dans la réserve (déjà classée de la mieux à la moins bien notée) jusqu'à `count` idées :
 * jamais une famille déjà présente, et des natures différentes de celles à éviter tant que c'est possible.
 * `strictNatures` : les natures à éviter sont exclues quoi qu'il arrive (la personne a refusé le domaine).
 */
export function pickFromReserve(
  reserve: ReserveIdea[],
  { count, avoidNatures = [], avoidFamilies = [], strictNatures = false }: {
    count: number;
    avoidNatures?: Nature[];
    avoidFamilies?: string[];
    strictNatures?: boolean;
  },
): ReserveIdea[] {
  const natures = new Set(avoidNatures);
  const families = new Set(avoidFamilies.map(family));
  const picked: ReserveIdea[] = [];
  const take = (r: ReserveIdea) => {
    picked.push(r);
    natures.add(r.candidate.nature);
    families.add(family(r.candidate.family));
  };
  // D'abord la variété (autre famille, autre nature), puis, sauf domaine refusé, on accepte une nature déjà vue.
  for (const relaxNature of [false, true]) {
    if (relaxNature && strictNatures) break;
    for (const r of reserve) {
      if (picked.length === count) return picked;
      if (picked.includes(r) || families.has(family(r.candidate.family))) continue;
      if (!relaxNature && natures.has(r.candidate.nature)) continue;
      take(r);
    }
  }
  return picked;
}
