import type { ReactionView } from "@/lib/idea-reactions";
import type { Criterion, IdeaContent } from "./schemas";

/** Ce que le navigateur reçoit. Une idée verrouillée n'expose ni son titre ni son contenu. */
export type IdeaCardView =
  | {
      locked: false;
      id: string;
      rank: number;
      title: string;
      hook: string;
      score: number | null;
      numbers: IdeaContent["numbers"] | null;
      reach: string | null;
      nature: string | null;
      selected: boolean;
      reaction: ReactionView | null;
      /** Version de la fiche (0 = d'origine) et ce qui a changé la dernière fois. */
      version: number;
      changes: string | null;
      canChange: boolean;
    }
  | { locked: true; id: string; rank: number; score: number | null };

export type IdeaDetailView = {
  id: string;
  rank: number;
  score: number | null;
  breakdown: { key: Criterion; label: string; value: number }[] | null;
  content: IdeaContent;
  reach: string | null;
  nature: string | null;
  selected: boolean;
  reaction: ReactionView | null;
  version: number;
  changes: string | null;
  canChange: boolean;
};

/** Possibilités de changer une idée avant de la choisir : quota du mois et idées encore en réserve. */
export type ChangeAllowance = { changesLeft: number; reserveLeft: number };

export type IdeasState =
  | { status: "no_diagnostic" }
  | { status: "none"; quotaLeft: number }
  | { status: "running"; startedAt: string }
  | { status: "failed"; quotaLeft: number; message: string }
  | {
      status: "ready";
      ideas: IdeaCardView[];
      quotaLeft: number;
      batchReaction: ReactionView | null;
      allowance: ChangeAllowance;
    };
