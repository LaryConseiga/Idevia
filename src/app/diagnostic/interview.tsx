"use client";

import { ArrowRight, Check, Clock, LockKeyhole, MessagesSquare, PenLine, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import type { Answer } from "@/server/diagnostic/question";
import type { ActionResult, DiagnosticView } from "@/server/diagnostic/view";
import { correctPortraitAction, startDiagnosticAction, submitAnswerAction, validatePortraitAction } from "./actions";
import { PortraitView } from "./portrait-view";
import { ProfilePanel } from "./profile-panel";
import { canSubmit, emptyAnswer, QuestionInput } from "./question-input";

const NETWORK_ERROR = "Connexion perdue : ta réponse n'a pas été envoyée. Vérifie ton réseau puis réessaie.";

/** Appelle une action serveur et traduit les coupures réseau (fréquentes sur mobile) en message clair. */
async function call(action: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await action();
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export function Interview({ initial }: { initial: DiagnosticView | null }) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await call(action);
      if (result.ok) {
        setView(result.view);
        onSuccess?.();
      } else setError(result.error);
    });
  }

  const restart = () => {
    if (window.confirm("Recommencer un nouvel entretien ? L'entretien en cours sera mis de côté.")) {
      run(startDiagnosticAction);
    }
  };

  if (!view) return <Intro onStart={() => run(startDiagnosticAction)} pending={pending} error={error} />;
  if (view.status === "in_progress") return <Conversation view={view} run={run} pending={pending} error={error} onRestart={restart} />;
  return <PortraitStep view={view} run={run} pending={pending} error={error} onRestart={restart} />;
}

// ---------------------------------------------------------------- Introduction

function Intro({ onStart, pending, error }: { onStart: () => void; pending: boolean; error: string | null }) {
  return (
    <div className="mx-auto max-w-2xl pt-4 sm:pt-10">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">Diagnostic</p>
      <h1 className="mt-2 text-3xl leading-tight font-bold text-balance sm:text-5xl">Faisons connaissance.</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Pas de questionnaire tout fait : chaque question dépend de ta réponse précédente. À la fin, je te montre
        ce que j&apos;ai compris de toi, et tu corriges si besoin.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Clock, title: "10 minutes environ", text: "Entre 8 et 18 questions." },
          { icon: MessagesSquare, title: "Avec tes mots", text: "Tu peux t'arrêter et reprendre plus tard." },
          { icon: LockKeyhole, title: "Confidentiel", text: "Réponses chiffrées, jamais ton nom ni ton email envoyés à l'IA." },
        ].map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-xl border border-border bg-card p-4">
            <Icon className="size-5 text-primary" aria-hidden />
            <p className="mt-2 font-semibold">{title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>

      {error && (
        <Alert tone="error" className="mt-6">
          {error}
        </Alert>
      )}
      <Button variant="cta" size="lg" className="mt-8 w-full sm:w-auto" onClick={onStart} disabled={pending} aria-busy={pending}>
        {pending ? "Un instant…" : "Commencer"} <ArrowRight aria-hidden />
      </Button>
      <p className="mt-3 text-sm text-muted-foreground">Gratuit, sans compte pour commencer.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Entretien

type StepProps = {
  view: DiagnosticView;
  run: (action: () => Promise<ActionResult>, onSuccess?: () => void) => void;
  pending: boolean;
  error: string | null;
  onRestart: () => void;
};

function useThinkingMessage(active: boolean, nearEnd: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => {
      clearInterval(timer);
      setSeconds(0);
    };
  }, [active]);
  if (seconds >= 10 && nearEnd) return "Je rédige ton portrait, encore quelques secondes…";
  if (seconds >= 5) return "Je relis tout ce que tu m'as dit…";
  return "Je réfléchis à ta réponse…";
}

function Conversation({ view, run, pending, error, onRestart }: StepProps) {
  const question = view.current;

  if (!question) {
    return (
      <Alert tone="warning">
        Cet entretien est incomplet.{" "}
        <button type="button" className="font-semibold underline" onClick={onRestart}>
          Recommencer
        </button>
      </Alert>
    );
  }

  const recent = view.transcript.slice(-2);
  const earlier = view.transcript.slice(0, -2);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">Question {view.answered + 1}</span>
          <button
            type="button"
            onClick={onRestart}
            disabled={pending}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-4" aria-hidden /> Recommencer
          </button>
        </div>

        {/* Mobile : progression et observations repliables au-dessus de la question. */}
        <details className="group rounded-xl border border-border bg-card px-4 py-3 lg:hidden">
          <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
            <span>
              Je te connais à <span className="font-bold text-primary tabular-nums">{view.progress} %</span>
            </span>
            <span className="text-muted-foreground group-open:hidden">Voir</span>
            <span className="hidden text-muted-foreground group-open:inline">Masquer</span>
          </summary>
          <div className="pt-4">
            <ProfilePanel view={view} />
          </div>
        </details>

        {view.transcript.length > 0 && (
          <div className="flex flex-col gap-3" aria-label="Échange précédent">
            {earlier.length > 0 && (
              <details className="text-sm">
                <summary className="min-h-8 cursor-pointer text-muted-foreground hover:text-foreground">
                  Voir les {earlier.length} échanges précédents
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {earlier.map((t, i) => (
                    <Exchange key={i} question={t.question} answer={t.answer} />
                  ))}
                </div>
              </details>
            )}
            {recent.map((t, i) => (
              <Exchange key={`r${i}-${view.answered}`} question={t.question} answer={t.answer} />
            ))}
          </div>
        )}

        {/* Remonté à chaque nouvelle question : formulaire vierge, focus replacé sur l'énoncé. */}
        <QuestionForm key={question.id} view={view} question={question} run={run} pending={pending} error={error} />
      </div>

      <aside className="hidden lg:block" aria-label="Ce que je comprends de toi">
        <div className="sticky top-6 rounded-card border border-border bg-card p-6 shadow-card">
          <ProfilePanel view={view} />
        </div>
      </aside>
    </div>
  );
}

function QuestionForm({
  view,
  question,
  run,
  pending,
  error,
}: Omit<StepProps, "onRestart"> & { question: NonNullable<DiagnosticView["current"]> }) {
  const [answer, setAnswer] = useState<Answer>(emptyAnswer);
  const [sent, setSent] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const thinking = useThinkingMessage(pending, view.answered + 1 >= view.minTurns);

  useEffect(() => {
    if (view.answered > 0) headingRef.current?.focus();
  }, [view.answered]);

  const ready = canSubmit(question, answer);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!ready || pending) return;
    const turn = view.answered + 1;
    setSent(describe(question, answer));
    run(() => submitAnswerAction({ diagnosticId: view.id, turn, answer }));
  }

  // Ctrl/Cmd + Entrée envoie depuis la zone de texte (Entrée seule ajoute une ligne).
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  };

  return pending && sent ? (
    <div className="flex flex-col gap-3" aria-live="polite">
      <Exchange question={question.prompt} answer={sent} />
      <div className="flex items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3.5 text-sm font-medium text-primary">
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 animate-bounce rounded-full bg-primary motion-reduce:animate-none"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
        {thinking}
      </div>
    </div>
  ) : (
    <Card className="p-5 sm:p-7">
      <form onSubmit={submit} onKeyDown={onKeyDown} className="flex flex-col gap-5">
        <div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-sans text-xl leading-snug font-semibold tracking-normal text-balance outline-none sm:text-2xl"
          >
            {question.prompt}
          </h1>
          {question.why && (
            <details className="mt-2 text-sm text-muted-foreground">
              <summary className="min-h-8 cursor-pointer hover:text-foreground">Pourquoi cette question ?</summary>
              <p className="mt-1 leading-relaxed">{question.why}</p>
            </details>
          )}
        </div>

        <QuestionInput question={question} value={answer} onChange={setAnswer} disabled={pending} />

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {question.kind === "text" ? "Ctrl + Entrée pour envoyer" : " "}
          </p>
          <Button type="submit" variant="cta" disabled={!ready || pending} aria-busy={pending}>
            Continuer <ArrowRight aria-hidden />
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Exchange({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="max-w-[90%] rounded-2xl rounded-tl-md bg-card px-4 py-2.5 text-sm leading-relaxed text-muted-foreground shadow-card">
        {question}
      </p>
      <p className="max-w-[90%] self-end rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line text-primary-foreground">
        {answer}
      </p>
    </div>
  );
}

function describe(question: NonNullable<DiagnosticView["current"]>, answer: Answer) {
  const labels = answer.choices.map((c) => question.options.find((o) => o.value === c)?.label ?? c);
  if (question.kind === "scale" && answer.scale) labels.push(`${answer.scale} / 5`);
  if (answer.text.trim()) labels.push(answer.text.trim());
  return labels.join(" · ");
}

// ---------------------------------------------------------------- Portrait

function PortraitStep({ view, run, pending, error, onRestart }: StepProps) {
  const [correcting, setCorrecting] = useState(false);
  const [correction, setCorrection] = useState("");
  const portrait = view.portrait;
  if (!portrait) return null;

  const completed = view.status === "completed";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pt-2 sm:pt-6">
      <div aria-live="polite">
        {pending && correcting ? (
          <Card className="flex items-center gap-3 p-6 text-primary">
            <Sparkles className="size-5 animate-pulse motion-reduce:animate-none" aria-hidden />
            Je réécris ton portrait avec ta correction…
          </Card>
        ) : (
          <PortraitView portrait={portrait} />
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {!completed && !correcting && (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="font-medium">Tu te reconnais dans ce portrait ?</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {view.correctionsLeft > 0 && (
              <Button variant="secondary" onClick={() => setCorrecting(true)} disabled={pending}>
                <PenLine aria-hidden /> Pas tout à fait
              </Button>
            )}
            <Button
              variant="cta"
              onClick={() => run(() => validatePortraitAction({ diagnosticId: view.id }))}
              disabled={pending}
              aria-busy={pending}
            >
              <Check aria-hidden /> Oui, c&apos;est bien moi
            </Button>
          </div>
        </Card>
      )}

      {!completed && correcting && (
        <Card className="p-5 sm:p-6">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => correctPortraitAction({ diagnosticId: view.id, correction }),
                () => {
                  setCorrecting(false);
                  setCorrection("");
                },
              );
            }}
          >
            <label htmlFor="correction" className="font-medium">
              Qu&apos;est-ce qui ne te ressemble pas, ou qu&apos;est-ce qui manque ?
            </label>
            <textarea
              id="correction"
              rows={4}
              maxLength={600}
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              disabled={pending}
              placeholder="Ex. : je ne veux pas vendre en ligne, je préfère le contact direct…"
              className="min-h-28 w-full resize-y rounded-xl border border-input bg-card px-4 py-3 text-base leading-relaxed focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
            />
            <p className="text-sm text-muted-foreground">
              {view.correctionsLeft} correction{view.correctionsLeft > 1 ? "s" : ""} possible
              {view.correctionsLeft > 1 ? "s" : ""}.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setCorrecting(false)} disabled={pending}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" disabled={pending || correction.trim().length < 3} aria-busy={pending}>
                Mettre à jour mon portrait
              </Button>
            </div>
          </form>
        </Card>
      )}

      {completed && <NextSteps anonymous={view.isAnonymous} onRestart={onRestart} />}
    </div>
  );
}

function NextSteps({ anonymous, onRestart }: { anonymous: boolean; onRestart: () => void }) {
  if (anonymous) {
    return (
      <Card className="flex flex-col gap-4 border-primary/30 p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Garde ton portrait et découvre tes idées</h2>
        <p className="leading-relaxed text-muted-foreground">
          Crée ton compte gratuit : ton portrait y sera rattaché et je pourrai te proposer des idées de business
          pensées pour toi, avec leur raison d&apos;être. Sans compte, il est effacé au bout de 7 jours.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="cta">
            <Link href="/inscription?suivant=/diagnostic">
              Créer mon compte gratuit <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/connexion?suivant=/diagnostic">J&apos;ai déjà un compte</Link>
          </Button>
        </div>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-4 border-primary/30 p-6 sm:p-8">
      <h2 className="text-2xl font-bold">Ton portrait est enregistré</h2>
      <p className="leading-relaxed text-muted-foreground">
        Prochaine étape : les trois idées de business qui te ressemblent le plus, chacune avec un plan pour tes
        30 premiers jours.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="cta">
          <Link href="/idees">
            Découvrir mes 3 idées <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button variant="ghost" onClick={onRestart}>
          <RotateCcw aria-hidden /> Refaire le diagnostic
        </Button>
      </div>
    </Card>
  );
}
