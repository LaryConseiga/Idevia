import type { HypothesisStatus } from "@/server/dal/projects";
import type { FieldReport } from "@/server/market/field-check";
import type { AdsPayload, MapsPayload, SearchPayload } from "@/server/market/sources";

/** Ce que le navigateur reçoit pour la page « Mon projet ». */

export type TaskView = {
  id: string;
  title: string;
  period: string | null;
  description: string | null;
  expectedResult: string | null;
  dueDate: string | null;
  done: boolean;
};

export type SourceView = { n: number; label: string; query: string; url: string; collectedAt: string; limits: string } & (
  | { kind: "local_competition"; payload: MapsPayload }
  | { kind: "search_demand"; payload: SearchPayload }
  | { kind: "ads"; payload: AdsPayload }
);

export type HypothesisView = { id: string; hypothesis: string; test: string | null; success: string | null; status: HypothesisStatus };

export type FieldView =
  | { status: "unavailable" }
  | { status: "none"; quotaLeft: number }
  | { status: "running"; startedAt: string }
  | { status: "failed"; message: string; quotaLeft: number }
  | {
      status: "ready";
      completedAt: string;
      report: FieldReport;
      sources: SourceView[];
      hypotheses: HypothesisView[];
      quotaLeft: number;
    };

export type ProjectView = {
  id: string;
  name: string;
  ideaId: string | null;
  /** Offre payante active et compte gratuit : le plan se lit, mais le suivi et le terrain sont réservés à Pro. */
  locked: boolean;
  tasks: TaskView[];
  progress: { done: number; total: number };
  nextTaskId: string | null;
  field: FieldView;
};
