/** Réactions possibles à une idée (étape « Sélection », voir docs/FLUX-IDEES.md). Partagé par le serveur et l'interface. */

export const IDEA_REACTIONS = ["interested", "not_for_me", "budget", "skills", "domain"] as const;
export const BATCH_REACTION = "none";
export type IdeaReactionReason = (typeof IDEA_REACTIONS)[number] | typeof BATCH_REACTION;

export const REACTION_LABELS: Record<IdeaReactionReason, string> = {
  interested: "Cette idée m'intéresse.",
  not_for_me: "L'idée est intéressante, mais pas pour moi.",
  budget: "Elle dépasse mon budget.",
  skills: "Elle nécessite des compétences que je n'ai pas.",
  domain: "Le domaine ne m'intéresse pas.",
  none: "Aucune de ces idées ne me correspond.",
};

export const REACTION_COMMENT_MAX = 400;

export type ReactionView = { reason: IdeaReactionReason; comment: string | null };
