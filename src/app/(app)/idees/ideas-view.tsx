"use client";

import { ArrowRight, Check, Clock, Compass, Globe2, Lightbulb, Lock, PenLine, RefreshCw, Scale, Sparkles, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RANK_LABELS, ScoreRing } from "@/components/ideas/score-ring";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { IdeaCardView, IdeasState } from "@/server/ideas/view";
import { generateIdeasAction, joinWaitlistAction } from "./actions";

export function IdeasView({ state }: { state: IdeasState }) {
  switch (state.status) {
    case "no_diagnostic":
      return <NeedDiagnostic />;
    case "none":
      return <Start quotaLeft={state.quotaLeft} />;
    case "running":
      return <Running startedAt={state.startedAt} />;
    case "failed":
      return <Start quotaLeft={state.quotaLeft} failure={state.message} />;
    case "ready":
      return <Ready ideas={state.ideas} quotaLeft={state.quotaLeft} />;
  }
}

function useGenerate() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const generate = () =>
    start(async () => {
      setError(null);
      try {
        const result = await generateIdeasAction();
        if (result.ok) router.refresh();
        else setError(result.error);
      } catch {
        setError("Connexion perdue. Vérifie ton réseau puis réessaie.");
      }
    });
  return { generate, pending, error };
}

function NeedDiagnostic() {
  return (
    <Card className="flex flex-col items-start gap-4 p-6 sm:p-8">
      <Compass className="size-8 text-primary" aria-hidden />
      <h1 className="text-2xl font-bold sm:text-3xl">D&apos;abord, faisons connaissance</h1>
      <p className="max-w-prose leading-relaxed text-muted-foreground">
        Tes idées sont construites à partir de ton portrait. Termine ton diagnostic et valide ton portrait : je
        pourrai alors te proposer les trois idées qui te ressemblent le plus.
      </p>
      <Button asChild variant="cta">
        <Link href="/diagnostic">
          Aller au diagnostic <ArrowRight aria-hidden />
        </Link>
      </Button>
    </Card>
  );
}

const STEPS = [
  { icon: Lightbulb, title: "J'imagine une douzaine d'idées", text: "Deux modèles d'IA différents, à partir de ton portrait." },
  { icon: Scale, title: "Je les compare une à une", text: "Tes compétences, ton budget, ton temps, et la demande là où sont tes clients." },
  { icon: PenLine, title: "Je t'écris un plan", text: "Pour les 3 meilleures : quoi faire, jour après jour, pendant 30 jours." },
];

function Start({ quotaLeft, failure }: { quotaLeft: number; failure?: string }) {
  const { generate, pending, error } = useGenerate();
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">Mes idées</p>
      <h1 className="mt-2 text-3xl leading-tight font-bold text-balance sm:text-4xl">
        Trois idées faites pour toi, pas une liste sans fin.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Je cherche large, près de chez toi comme en ligne ou entre deux pays, puis je ne garde que les trois idées qui
        collent vraiment à ton portrait, classées de la plus adaptée à la moins adaptée.
      </p>

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="rounded-xl border border-border bg-card p-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-xs text-primary">{i + 1}</span>
              <Icon className="size-4" aria-hidden />
            </span>
            <p className="mt-2 font-semibold">{title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>

      {failure && (
        <Alert tone="warning" className="mt-6">
          {failure} Ça arrive avec les services gratuits très demandés : relance, ça ne compte pas dans ton quota.
        </Alert>
      )}
      {error && (
        <Alert tone="error" className="mt-6">
          {error}
        </Alert>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="cta" size="lg" onClick={generate} disabled={pending || quotaLeft === 0} aria-busy={pending}>
          <Sparkles aria-hidden /> {pending ? "Je me lance…" : failure ? "Relancer" : "Découvrir mes 3 idées"}
        </Button>
        <p className="text-sm text-muted-foreground">Environ 1 à 2 minutes.</p>
      </div>
    </div>
  );
}

const PHASES = [
  { after: 0, text: "J'imagine une douzaine d'idées à partir de ton portrait…" },
  { after: 25, text: "Je les compare une à une : tes compétences, ton budget, la demande là où sont tes clients…" },
  { after: 45, text: "J'écris le plan d'action des trois meilleures…" },
  { after: 100, text: "J'y suis presque, je relis tout…" },
];

function Running({ startedAt }: { startedAt: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(() => Math.max(0, (Date.now() - Date.parse(startedAt)) / 1000));

  // La génération tourne côté serveur : on rafraîchit la page régulièrement pour récupérer le résultat.
  useEffect(() => {
    const tick = setInterval(() => setElapsed((Date.now() - Date.parse(startedAt)) / 1000), 1000);
    const poll = setInterval(() => router.refresh(), 4000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [router, startedAt]);

  const phase = [...PHASES].reverse().find((p) => elapsed >= p.after) ?? PHASES[0];
  const current = PHASES.indexOf(phase);
  const progress = Math.min(95, Math.round((elapsed / 90) * 100));

  return (
    <div className="mx-auto max-w-2xl pt-4 sm:pt-10">
      <Card className="p-6 sm:p-8">
        <Sparkles className="size-8 animate-pulse text-primary motion-reduce:animate-none" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Je prépare tes 3 idées</h1>
        <p className="mt-2 text-muted-foreground" aria-live="polite">
          {phase.text}
        </p>
        <div
          className="mt-6 h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avancement de la génération"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </div>
        <ol className="mt-6 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className={cn("flex items-center gap-3 text-sm", i > current && "text-muted-foreground")}>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  i < current ? "border-primary bg-primary text-primary-foreground" : i === current ? "border-primary text-primary" : "border-border",
                )}
              >
                {i < current ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              {step.title}
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-muted-foreground">Tu peux fermer cette page : je continue et tes idées t&apos;attendront ici.</p>
      </Card>
    </div>
  );
}

function Ready({ ideas, quotaLeft }: { ideas: IdeaCardView[]; quotaLeft: number }) {
  const { generate, pending, error } = useGenerate();
  const [best, ...others] = ideas;
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Mes idées</p>
        <h1 className="mt-2 text-3xl leading-tight font-bold text-balance sm:text-4xl">Tes 3 idées, de la plus adaptée à la moins adaptée</h1>
        <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">
          Chacune vient avec un plan concret pour tes 30 premiers jours. Ouvre-les, compare, puis choisis celle avec
          laquelle tu veux avancer.
        </p>
      </header>

      {best && <IdeaCard idea={best} featured />}
      <div className="grid gap-4 md:grid-cols-2">
        {others.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Aucune ne te parle vraiment ? {quotaLeft > 0 ? `Il te reste ${quotaLeft} nouvelle${quotaLeft > 1 ? "s" : ""} génération${quotaLeft > 1 ? "s" : ""} ce mois-ci.` : "Tes nouvelles générations reviennent le mois prochain."}
        </p>
        <Button variant="secondary" onClick={generate} disabled={pending || quotaLeft === 0} aria-busy={pending}>
          <RefreshCw aria-hidden /> Proposer 3 autres idées
        </Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

function IdeaCard({ idea, featured = false }: { idea: IdeaCardView; featured?: boolean }) {
  if (idea.locked) return <LockedCard rank={idea.rank} score={idea.score} featured={featured} />;
  return (
    <Card className={cn("relative flex flex-col gap-5 p-5 sm:p-7", featured && "border-primary/40 ring-1 ring-primary/20")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              featured ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            n°{idea.rank} · {RANK_LABELS[idea.rank]}
          </span>
          {idea.nature && (
            <span className="ml-2 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              {idea.nature}
            </span>
          )}
          {idea.reach && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              <Globe2 className="size-3.5" aria-hidden /> {idea.reach}
            </span>
          )}
          {idea.selected && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
              <Check className="size-3.5" aria-hidden /> Ton choix
            </span>
          )}
          <h2 className={cn("mt-3 leading-tight font-bold text-balance", featured ? "text-2xl sm:text-3xl" : "text-xl")}>{idea.title}</h2>
        </div>
        {idea.score !== null && <ScoreRing score={idea.score} size={featured ? "lg" : "md"} />}
      </div>
      <p className={cn("leading-relaxed", featured ? "text-lg" : "text-muted-foreground")}>{idea.hook}</p>

      {idea.numbers && (
        <dl className={cn("grid gap-2", featured ? "sm:grid-cols-3" : "")}>
          {[
            { icon: Wallet, label: "Pour démarrer", value: idea.numbers.startBudget },
            { icon: Clock, label: "Ton temps", value: idea.numbers.timePerWeek },
            { icon: Target, label: "Premier objectif", value: idea.numbers.firstGoal },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}

      <Button asChild variant={featured ? "cta" : "secondary"} className="mt-auto self-start">
        <Link href={`/idees/${idea.id}`}>
          Voir l&apos;idée et son plan <ArrowRight aria-hidden />
        </Link>
      </Button>
    </Card>
  );
}

function LockedCard({ rank, score, featured }: { rank: number; score: number | null; featured: boolean }) {
  const [joined, setJoined] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Card className={cn("flex flex-col gap-4 p-5 sm:p-7", featured && "border-primary/40")}>
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          n°{rank} · {RANK_LABELS[rank]}
        </span>
        {score !== null && <ScoreRing score={score} size="md" />}
      </div>
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-highlight-soft text-highlight">
          <Lock className="size-5" aria-hidden />
        </span>
        <p className="font-semibold">
          {rank === 1 ? "Ta meilleure idée" : "Une idée encore mieux classée"} t&apos;attend, avec son plan et le suivi.
        </p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Elle fait partie de l&apos;offre Pro, qui arrive bientôt. Laisse-moi te prévenir dès son ouverture.
      </p>
      <Button
        variant="secondary"
        className="self-start"
        disabled={joined || pending}
        onClick={() =>
          start(async () => {
            const result = await joinWaitlistAction();
            if (result.ok) setJoined(true);
          })
        }
      >
        {joined ? (
          <>
            <Check aria-hidden /> C&apos;est noté
          </>
        ) : (
          "Me prévenir"
        )}
      </Button>
    </Card>
  );
}
