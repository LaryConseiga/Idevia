"use client";

import { Check } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { reactAction } from "@/app/(parcours)/idees/actions";
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

/**
 * Réaction à une idée (`ideaId`) ou à tout le lot (`ideaId` nul, une seule réponse : « Aucune de ces idées… »).
 * La raison est enregistrée dès le clic ; le commentaire libre, facultatif, s'envoie ensuite.
 */
export function IdeaReaction({ ideaId, initial, className }: { ideaId: string | null; initial: ReactionView | null; className?: string }) {
  const reasons: readonly IdeaReactionReason[] = ideaId ? IDEA_REACTIONS : [BATCH_REACTION];
  const [reason, setReason] = useState<IdeaReactionReason | null>(initial?.reason ?? null);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [savedComment, setSavedComment] = useState(initial?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
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
      {error && <Alert tone="error">{error}</Alert>}
    </fieldset>
  );
}
