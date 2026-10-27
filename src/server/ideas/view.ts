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
      selected: boolean;
    }
  | { locked: true; id: string; rank: number; score: number | null };

export type IdeaDetailView = {
  id: string;
  rank: number;
  score: number | null;
  breakdown: { key: Criterion; label: string; value: number }[] | null;
  content: IdeaContent;
  reach: string | null;
  selected: boolean;
};

export type IdeasState =
  | { status: "no_diagnostic" }
  | { status: "none"; quotaLeft: number }
  | { status: "running"; startedAt: string }
  | { status: "failed"; quotaLeft: number; message: string }
  | { status: "ready"; ideas: IdeaCardView[]; quotaLeft: number };
