"use client";

import { Check, RefreshCw, Shuffle, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { changeIdeaAction, reactAction, replaceAllIdeasAction } from "@/app/(parcours)/idees/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import {
  BATCH_REACTION,
  IDEA_REACTIONS,
  REACTION_COMMENT_MAX,
  REACTION_LABELS,
  type IdeaReactionReason,
  type ReactionView,
} from "@/lib/idea-reactions";
import { cn } from "@/lib/utils";

const THANKS: Partial<Record<IdeaReactionReason, string>> = {
  interested: "Noté ! Quand tu veux te lancer, choisis-la : son plan devient ta liste d'actions.",
  none: "Merci, c'est noté. Dis-moi ce qui manque : ça m'aide à viser plus juste.",
};

/** Ajuster la même idée : seulement pour ces réactions, avec un libellé qui dit ce qui va changer. */
const ADJUST_LABELS: Partial<Record<IdeaReactionReason, string>> = {
  budget: "L'adapter à un petit budget",
  skills: "L'adapter sans ces compétences",
  not_for_me: "La rapprocher de moi",
};

/** Ce que la personne peut encore changer : quota du mois, idées en réserve, et cette idée-ci (2 changements au plus). */
export type ChangeOptions = { changesLeft: number; reserveLeft: number; canChange: boolean };

/**
 * Réaction à une idée (`ideaId`) ou à tout le lot (`ideaId` nul, une seule réponse : « Aucune de ces idées… »).
 * La raison est enregistrée dès le clic ; le commentaire libre, facultatif, s'envoie ensuite. Après une réaction
 * négative, la personne peut faire ajuster l'idée ou en recevoir une autre, tirée de sa réserve.
 */
export function IdeaReaction({
  ideaId,
  initial,
  options,
  className,
}: {
  ideaId: string | null;
  initial: ReactionView | null;
  options?: ChangeOptions;
  className?: string;
}) {
  const reasons: readonly IdeaReactionReason[] = ideaId ? IDEA_REACTIONS : [BATCH_REACTION];
  const router = useRouter();
  const [reason, setReason] = useState<IdeaReactionReason | null>(initial?.reason ?? null);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [savedComment, setSavedComment] = useState(initial?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [changing, setChanging] = useState<string | null>(null);
  const id = useId();

  const save = (next: IdeaReactionReason, text: string) =>
    start(async () => {
      setError(null);
      try {
        const result = await reactAction({ ideaId, reason: next, comment: text || null });
        if (!result.ok) return setError(result.error);
        setReason(next);
        setSavedComment(text.trim());
      } catch {
        setError("Connexion perdue. Réessaie dans un instant.");
      }
    });

  // La précision libre compte pour l'ajustement : on l'enregistre d'abord si elle a changé.
  const change = (mode: "replace" | "adjust" | "all", waiting: string) =>
    start(async () => {
      setError(null);
      setChanging(waiting);
      try {
        if (reason && comment.trim() !== savedComment) {
          const saved = await reactAction({ ideaId, reason, comment: comment || null });
          if (!saved.ok) return setError(saved.error);
          setSavedComment(comment.trim());
        }
        const result = mode === "all" ? await replaceAllIdeasAction() : await changeIdeaAction(ideaId!, mode);
        if (!result.ok) return setError(result.error);
        router.refresh();
      } catch {
        setError("Connexion perdue. Réessaie dans un instant.");
      } finally {
        setChanging(null);
      }
    });

  const negative = reason !== null && reason !== "interested";
  const canChange = Boolean(options && options.changesLeft > 0 && options.canChange);
  const adjustLabel = reason ? ADJUST_LABELS[reason] : undefined;
  const canReplace = canChange && options!.reserveLeft > 0;

  return (
    <fieldset className={cn("flex flex-col gap-3", className)} aria-busy={pending}>
      <legend className="sr-only">{ideaId ? "Ta réaction à cette idée" : "Ta réaction à l'ensemble des idées"}</legend>
      <div className="flex flex-wrap gap-2">
        {reasons.map((r) => {
          const active = reason === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={active}
              disabled={pending}
              onClick={() => save(r, comment)}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition-colors disabled:cursor-progress",
                active ? "border-primary bg-primary-soft text-primary" : "border-border bg-card hover:bg-muted",
              )}
            >
              {active && <Check className="size-4 shrink-0" aria-hidden />}
              {REACTION_LABELS[r]}
            </button>
          );
        })}
      </div>

      {reason && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {THANKS[reason] ?? "Merci, c'est noté. Ça m'aide à te proposer des idées plus justes."}
          </p>
          <label htmlFor={`${id}-comment`} className="text-sm font-medium">
            {reason === "interested" ? "Un détail à me dire ? (facultatif)" : "Qu'est-ce qui ne te convient pas ? (facultatif)"}
          </label>
          <textarea
            id={`${id}-comment`}
            rows={2}
            maxLength={REACTION_COMMENT_MAX}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={pending}
            placeholder={reason === "interested" ? "Ex. : je pourrais commencer le week-end…" : "Ex. : je n'ai pas de voiture, je ne veux pas vendre à ma famille…"}
            className="min-h-20 w-full resize-y rounded-xl border border-input bg-card px-4 py-3 text-base leading-relaxed focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
          />
          {comment.trim() !== savedComment && (
            <Button type="button" variant="secondary" size="sm" className="self-start" disabled={pending} onClick={() => save(reason, comment)}>
              {pending ? "Un instant…" : "Envoyer"}
            </Button>
          )}
        </div>
      )}

      {negative && (
        <div className="flex flex-col gap-2">
          {canChange && (ideaId ? adjustLabel || canReplace : canReplace) && (
            <>
              <p className="text-sm font-medium">{ideaId ? "On ajuste ?" : "Je puise dans les idées que j'avais mises de côté pour toi ?"}</p>
              <div className="flex flex-wrap gap-2">
                {ideaId && adjustLabel && (
                  <Button type="button" variant="primary" size="sm" disabled={pending} onClick={() => change("adjust", "Je réécris cette idée selon ta réponse…")}>
                    <Wand2 aria-hidden /> {adjustLabel}
                  </Button>
                )}
                {ideaId && canReplace && (
                  <Button
                    type="button"
                    variant={adjustLabel ? "secondary" : "primary"}
                    size="sm"
                    disabled={pending}
                    onClick={() => change("replace", "Je rédige une autre idée pour toi…")}
                  >
                    <Shuffle aria-hidden /> Une autre idée à la place
                  </Button>
                )}
                {!ideaId && canReplace && (
                  <Button type="button" variant="primary" size="sm" disabled={pending} onClick={() => change("all", "Je rédige d'autres idées pour toi…")}>
                    <RefreshCw aria-hidden /> Me proposer d&apos;autres idées
                  </Button>
                )}
              </div>
            </>
          )}
          {changing && (
            <p className="text-sm text-muted-foreground" role="status">
              {changing} Ça prend 10 à 40 secondes, ne ferme pas la page.
            </p>
          )}
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </fieldset>
  );
}
