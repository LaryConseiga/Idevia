"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { chooseIdeaAction } from "../actions";

/** Barre d'action collée en bas sur mobile (au-dessus de la navigation), en fin de page sur ordinateur. */
export function ChooseIdea({ ideaId, selected }: { ideaId: string; selected: boolean }) {
  const [chosen, setChosen] = useState(selected);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const choose = () =>
    start(async () => {
      setError(null);
      try {
        const result = await chooseIdeaAction(ideaId);
        if (result.ok) setChosen(true);
        else setError(result.error);
      } catch {
        setError("Connexion perdue. Réessaie dans un instant.");
      }
    });

  return (
    <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:z-auto md:rounded-card md:border md:bg-card md:p-6">
      {error && (
        <Alert tone="error" className="mb-3">
          {error}
        </Alert>
      )}
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden font-medium md:block" aria-live="polite">
          {chosen ? "C'est ton idée. On avance ensemble ?" : "Cette idée te donne envie ?"}
        </p>
        {chosen ? (
          <Button asChild variant="cta">
            <Link href="/tableau-de-bord">
              <Check aria-hidden /> Idée choisie, voir mon tableau de bord <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="cta" onClick={choose} disabled={pending} aria-busy={pending}>
            {pending ? "Un instant…" : "Je choisis cette idée"}
          </Button>
        )}
      </div>
    </div>
  );
}
