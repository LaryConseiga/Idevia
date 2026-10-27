"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import type { Answer, Question } from "@/server/diagnostic/question";
import { cn } from "@/lib/utils";

export const MAX_TEXT = 800;

export const emptyAnswer = (): Answer => ({ choices: [], text: "", scale: null });

/** L'utilisateur a donné assez pour continuer (même règle que la validation serveur). */
export function canSubmit(q: Question, a: Answer) {
  if (q.kind === "scale") return a.scale !== null;
  if (q.kind === "text") return a.text.trim().length >= 2;
  return a.choices.length > 0 || a.text.trim().length > 0;
}

type Props = { question: Question; value: Answer; onChange: (a: Answer) => void; disabled: boolean };

export function QuestionInput({ question, value, onChange, disabled }: Props) {
  const otherId = useId();

  if (question.kind === "text") {
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={otherId} className="sr-only">
          Ta réponse
        </label>
        <textarea
          id={otherId}
          name="text"
          rows={4}
          maxLength={MAX_TEXT}
          disabled={disabled}
          value={value.text}
          placeholder={question.placeholder ?? "Écris avec tes mots, même en quelques phrases."}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          className="min-h-32 w-full resize-y rounded-xl border border-input bg-card px-4 py-3 text-base leading-relaxed placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none disabled:opacity-60"
        />
        <p className="self-end text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {value.text.length} / {MAX_TEXT}
        </p>
      </div>
    );
  }

  if (question.kind === "scale") {
    return (
      <fieldset disabled={disabled} className="flex flex-col gap-2">
        <legend className="sr-only">
          De 1 ({question.scale?.min}) à 5 ({question.scale?.max})
        </legend>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const selected = value.scale === n;
            return (
              <label
                key={n}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center justify-center rounded-xl border text-lg font-semibold transition-colors duration-200 has-focus-visible:ring-4 has-focus-visible:ring-primary/25",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50",
                )}
              >
                <input
                  type="radio"
                  name="scale"
                  value={n}
                  checked={selected}
                  onChange={() => onChange({ ...value, scale: n })}
                  className="sr-only"
                />
                {n}
              </label>
            );
          })}
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{question.scale?.min}</span>
          <span>{question.scale?.max}</span>
        </div>
      </fieldset>
    );
  }

  const multi = question.kind === "multi";
  const toggle = (optionValue: string) => {
    if (!multi) return onChange({ ...value, choices: [optionValue] });
    // « Je ne sais pas encore » est exclusif des autres choix.
    if (optionValue === "unsure") return onChange({ ...value, choices: value.choices.includes("unsure") ? [] : ["unsure"] });
    const without = value.choices.filter((c) => c !== optionValue && c !== "unsure");
    onChange({ ...value, choices: value.choices.includes(optionValue) ? without : [...without, optionValue] });
  };

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-3">
      <legend className="sr-only">{multi ? "Plusieurs choix possibles" : "Un seul choix"}</legend>
      {multi && <p className="text-sm text-muted-foreground">Plusieurs réponses possibles.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => {
          const selected = value.choices.includes(option.value);
          const unsure = option.value === "unsure";
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-base transition-colors duration-200 has-focus-visible:ring-4 has-focus-visible:ring-primary/25",
                selected ? "border-primary bg-primary-soft font-medium" : "border-border bg-card hover:border-primary/50",
                unsure && !selected && "border-dashed text-muted-foreground",
              )}
            >
              <input
                type={multi ? "checkbox" : "radio"}
                name="choice"
                value={option.value}
                checked={selected}
                onChange={() => toggle(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center border-2 transition-colors",
                  multi ? "rounded-md" : "rounded-full",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {selected && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="whitespace-normal">{option.label}</span>
            </label>
          );
        })}
      </div>
      {question.allowOther && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={otherId} className="text-sm font-medium text-muted-foreground">
            {value.choices.length ? "Tu veux préciser ? (facultatif)" : "Autre réponse"}
          </label>
          <input
            id={otherId}
            name="other"
            maxLength={300}
            value={value.text}
            onChange={(e) => onChange({ ...value, text: e.target.value })}
            className="min-h-12 w-full rounded-xl border border-input bg-card px-4 text-base focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
          />
        </div>
      )}
    </fieldset>
  );
}
