import type { Portrait } from "./engine";
import type { Dimension } from "./profile";
import type { Question } from "./question";

/** Ce que le navigateur reçoit : jamais l'état interne complet ni les identifiants de session. */
export type DiagnosticView = {
  id: string;
  status: "in_progress" | "portrait_ready" | "completed";
  answered: number;
  minTurns: number;
  maxTurns: number;
  /** « Je te connais à X % ». */
  progress: number;
  transcript: { question: string; answer: string }[];
  current: Question | null;
  /** Observations du modèle, montrées pendant l'entretien : la personne voit qu'elle est comprise. */
  insights: string[];
  dimensions: { key: Dimension; label: string; confidence: number }[];
  portrait: Omit<Portrait, "source"> | null;
  correctionsLeft: number;
  isAnonymous: boolean;
};

export type ActionResult = { ok: true; view: DiagnosticView } | { ok: false; error: string };
