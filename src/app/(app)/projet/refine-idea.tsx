"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { refineIdeaAction } from "./actions";

const EXAMPLES = [
  "Je n'ai pas de machine à coudre pour l'instant.",
  "Je préfère vendre aux entreprises plutôt qu'aux particuliers.",
  "Les clients trouvent le prix trop élevé.",
  "Je veux aller plus loin : détaille-moi l'offre et les prix.",
];

/** La personne dit ce qui ne lui va pas ou ce qu'elle a appris ; l'idée et le plan sont réécrits en conséquence. */
export function RefineIdea({ left }: { left: number }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      try {
        const result = await refineIdeaAction(text);
        if (result.ok) {
          setChanges(result.changes);
          setText("");
          setOpen(false);
        } else setError(result.error);
      } catch {
        setError("Connexion perdue. Réessaie dans un instant.");
      }
    });

  return (
    <section aria-labelledby="repenser" className="flex flex-col gap-4">
      {changes && (
        <Alert tone="success" className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>
            <strong>Ton idée a été repensée.</strong> {changes}
          </span>
        </Alert>
      )}
      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <div>
          <h2 id="repenser" className="flex items-center gap-2 font-sans text-xl font-semibold tracking-normal">
            <RefreshCw className="size-5 text-primary" aria-hidden /> Repenser mon idée
          </h2>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            Quelque chose ne colle pas, ou tu as appris du nouveau sur le terrain ? Dis-le : je retravaille ton idée et ton
            plan en gardant les étapes déjà faites.
          </p>
        </div>
        {!open ? (
          <Button variant="secondary" className="self-start" onClick={() => setOpen(true)} disabled={left === 0}>
            {left === 0 ? "Plus de refonte possible ce mois-ci" : "Donner mon retour"}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <label htmlFor="retour" className="text-sm font-medium">
              Ton retour
            </label>
            <textarea
              id="retour"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 1200))}
              placeholder="Par exemple : je n'ai que 5 heures par semaine, et mes premiers clients veulent surtout…"
              className="rounded-xl border border-input bg-background px-4 py-3 text-base leading-relaxed"
            />
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setText(example)}
                  className="min-h-9 cursor-pointer rounded-full border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </div>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Button variant="cta" onClick={submit} disabled={pending || text.trim().length < 10} aria-busy={pending}>
                {pending ? "Je repense ton idée… (environ 30 secondes)" : "Repenser mon idée"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {left} refonte{left > 1 ? "s" : ""} possible{left > 1 ? "s" : ""} ce mois-ci
              </p>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
