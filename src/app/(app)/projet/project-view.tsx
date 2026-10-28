"use client";

import { ArrowRight, Check, CheckCircle2, ChevronDown, Flag, MessageCircle, PartyPopper } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProjectView as Project, TaskView } from "@/server/projects/view";
import { toggleTaskAction } from "./actions";
import { FieldSection } from "./field-section";

const dueFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
export const formatDue = (date: string) => dueFormat.format(new Date(`${date}T00:00:00Z`));

/** Ouvre le coach avec une question déjà écrite sur cette étape. */
const askCoachHref = (task: TaskView) =>
  `/assistant?question=${encodeURIComponent(`Je bloque sur l'étape « ${task.title} ». Par quoi je commence ?`)}`;

export function ProjectView({ project }: { project: Project }) {
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  // Cocher une tâche doit répondre tout de suite, même sur une connexion lente.
  const [tasks, setOptimistic] = useOptimistic(project.tasks, (list, change: { id: string; done: boolean }) =>
    list.map((t) => (t.id === change.id ? { ...t, done: change.done } : t)),
  );

  const toggle = (task: TaskView, done: boolean) =>
    start(async () => {
      setError(null);
      setOptimistic({ id: task.id, done });
      try {
        const result = await toggleTaskAction(task.id, done);
        if (!result.ok) setError(result.error);
      } catch {
        setError("Connexion perdue. Réessaie dans un instant.");
      }
    });

  const done = tasks.filter((t) => t.done).length;
  const next = tasks.find((t) => !t.done) ?? null;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const canTrack = !project.locked;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Ton projet</p>
        <h1 className="text-3xl leading-tight font-bold text-balance sm:text-4xl">{project.name}</h1>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="font-medium">
              {done === 0
                ? "Ton plan des 30 premiers jours t'attend."
                : done === tasks.length
                  ? "Tout ton plan est fait. Bravo."
                  : `${done} étape${done > 1 ? "s" : ""} faite${done > 1 ? "s" : ""} sur ${tasks.length}`}
            </span>
            <span className="tabular-nums text-muted-foreground">{percent} %</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avancement du plan"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
        </div>
        {project.ideaId && (
          <Link
            href={`/idees/${project.ideaId}`}
            className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-primary hover:underline"
          >
            Revoir la fiche de l&apos;idée <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      {next ? (
        <NowCard task={next} canTrack={canTrack} onDone={() => toggle(next, true)} />
      ) : (
        <Card className="flex items-start gap-4 p-6 sm:p-8">
          <PartyPopper className="size-8 shrink-0 text-accent" aria-hidden />
          <div>
            <h2 className="font-sans text-xl font-semibold tracking-normal">Ton premier mois est bouclé</h2>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Tu as suivi tout ton plan. Regarde ce que tu as appris sur le terrain, et garde ce rythme.
            </p>
          </div>
        </Card>
      )}

      <section aria-labelledby="plan">
        <h2 id="plan" className="text-2xl font-bold">
          Ton plan sur 30 jours
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {canTrack ? "Coche chaque étape quand elle est faite. Touche une étape pour voir le détail." : "Touche une étape pour voir le détail."}
        </p>
        <ol className="mt-5 flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} canTrack={canTrack} isNext={task.id === next?.id} onToggle={(value) => toggle(task, value)} />
          ))}
        </ol>
      </section>

      <FieldSection field={project.field} locked={project.locked} />
    </div>
  );
}

function NowCard({ task, canTrack, onDone }: { task: TaskView; canTrack: boolean; onDone: () => void }) {
  return (
    <section aria-labelledby="maintenant" className="rounded-card bg-accent p-6 text-accent-foreground shadow-card sm:p-8">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Flag className="size-4" aria-hidden />
        <span id="maintenant">Maintenant</span>
        {task.dueDate && <span className="font-normal opacity-80">· d&apos;ici le {formatDue(task.dueDate)}</span>}
      </p>
      <h2 className="mt-2 font-sans text-2xl leading-snug font-semibold tracking-normal text-balance">{task.title}</h2>
      {task.description && <p className="mt-3 text-lg leading-relaxed">{task.description}</p>}
      {task.expectedResult && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-background/15 px-3.5 py-2.5 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">À la fin : </span>
            {task.expectedResult}
          </span>
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {canTrack && (
          <Button onClick={onDone} className="w-full bg-background text-foreground hover:bg-background/90 sm:w-auto">
            <Check aria-hidden /> C&apos;est fait
          </Button>
        )}
        <Link
          href={askCoachHref(task)}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold underline-offset-4 hover:underline"
        >
          <MessageCircle className="size-4" aria-hidden /> Je bloque, j&apos;en parle au coach
        </Link>
      </div>
    </section>
  );
}

function TaskRow(props: { task: TaskView; canTrack: boolean; isNext: boolean; onToggle: (done: boolean) => void }) {
  const { task } = props;
  return (
    <li className={cn("flex gap-3 rounded-card border bg-card p-3 sm:p-4", props.isNext ? "border-accent/60" : "border-border")}>
      {props.canTrack ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? `Marquer « ${task.title} » comme à faire` : `Marquer « ${task.title} » comme faite`}
          onClick={() => props.onToggle(!task.done)}
          className="-m-1.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full"
        >
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full border-2 transition-colors",
              task.done ? "border-success bg-success text-success-foreground" : "border-border hover:border-primary",
            )}
          >
            {task.done && <Check className="size-4" aria-hidden />}
          </span>
        </button>
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
          {task.done ? <Check className="size-4" aria-hidden /> : null}
        </span>
      )}
      <details className="group min-w-0 flex-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-primary">
              {task.period}
              {task.dueDate && <span className="font-normal text-muted-foreground"> · d&apos;ici le {formatDue(task.dueDate)}</span>}
            </span>
            <span className={cn("mt-0.5 block font-semibold", task.done && "text-muted-foreground line-through")}>{task.title}</span>
          </span>
          <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        {task.description && <p className="mt-2 leading-relaxed">{task.description}</p>}
        {task.expectedResult && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <span>
              <span className="font-semibold">À la fin : </span>
              {task.expectedResult}
            </span>
          </p>
        )}
        {!task.done && (
          <Link href={askCoachHref(task)} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <MessageCircle className="size-4" aria-hidden /> Demander de l&apos;aide au coach
          </Link>
        )}
      </details>
    </li>
  );
}
