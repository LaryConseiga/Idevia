import { ArrowRight, Check, CheckCircle2, Compass, Flag, Lightbulb, Sparkles, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ScoreRing } from "@/components/ideas/score-ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/dal/session";
import { hasAnonymousToClaim, loadDiagnosticView } from "@/server/diagnostic/service";
import { getIdeaDetail, getIdeasState, getSelectedIdea } from "@/server/ideas/service";
import { loadDiagnosticProgress, realtimeUrl } from "@/server/realtime";
import { DiagnosticLive } from "./diagnostic-live";

export const metadata: Metadata = { title: "Tableau de bord" };

const JOURNEY = ["Faire connaissance", "Découvrir tes idées", "Choisir ton idée", "Passer à l'action"];

export default async function DashboardPage() {
  const user = await requireUser("/tableau-de-bord");
  // Un entretien commencé avant l'inscription attend d'être rattaché au compte.
  if (await hasAnonymousToClaim()) redirect("/diagnostic/rattacher");

  const [diagnostic, progress, ideas, selected] = await Promise.all([
    loadDiagnosticView(),
    loadDiagnosticProgress(user.id),
    getIdeasState(user.id),
    getSelectedIdea(user.id),
  ]);
  const chosen = selected ? await getIdeaDetail(user.id, selected.id) : null;
  const firstName = user.name.split(" ")[0];

  const live =
    progress && realtimeUrl ? (
      <DiagnosticLive url={realtimeUrl} userId={user.id} sealedQuery={progress.sealedQuery} initialData={progress.initialData} />
    ) : null;

  const step = chosen && chosen !== "locked" ? 3 : ideas.status === "ready" ? 2 : diagnostic?.status === "completed" ? 1 : 0;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">Bonjour {firstName}</h1>
        <p className="mt-2 text-muted-foreground">{SUBTITLES[step]}</p>
      </header>

      <Journey current={step} />

      {chosen && chosen !== "locked" ? (
        <ChosenIdea
          id={chosen.id}
          title={chosen.content.title}
          score={chosen.score}
          today={chosen.content.todayAction}
          nextStep={chosen.content.plan[0]}
        />
      ) : (
        <NextStep diagnostic={diagnostic} ideas={ideas} live={live} />
      )}

      {diagnostic?.status === "completed" && diagnostic.portrait && (
        <div className="grid gap-4 md:grid-cols-2">
          <Shortcut href="/diagnostic" icon={<UserRound className="size-5" aria-hidden />} label="Ton portrait" text={diagnostic.portrait.headline} />
          {ideas.status === "ready" && (
            <Shortcut
              href="/idees"
              icon={<Lightbulb className="size-5" aria-hidden />}
              label="Tes 3 idées"
              text={chosen ? "Revoir les trois idées et leur classement." : "Compare-les et choisis celle qui te donne envie."}
            />
          )}
        </div>
      )}
    </div>
  );
}

const SUBTITLES = [
  "On commence par faire connaissance : c'est la base de tout le reste.",
  "Ton portrait est prêt. Place à tes idées.",
  "Tes idées sont prêtes. Il ne reste qu'à choisir.",
  "Ton idée est choisie. Voici ce qui t'attend aujourd'hui.",
];

function Journey({ current }: { current: number }) {
  return (
    <nav aria-label="Ton parcours">
      <ol className="grid grid-cols-4 gap-2">
        {JOURNEY.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} aria-current={active ? "step" : undefined} className="flex flex-col gap-2">
              <span className={cn("h-1.5 rounded-full", done ? "bg-primary" : active ? "bg-accent" : "bg-muted")} />
              <span
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium sm:text-sm",
                  active ? "text-foreground" : "text-muted-foreground",
                  !active && "max-sm:sr-only",
                )}
              >
                {done && <Check className="size-3.5 text-primary" aria-hidden />}
                <span className="sr-only">{done ? "Fait : " : active ? "En cours : " : "À venir : "}</span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type NextStepProps = {
  diagnostic: Awaited<ReturnType<typeof loadDiagnosticView>>;
  ideas: Awaited<ReturnType<typeof getIdeasState>>;
  live: ReactNode;
};

/** Une seule action principale à l'écran, selon où en est la personne. */
function NextStep({ diagnostic, ideas, live }: NextStepProps) {
  if (!diagnostic) {
    return (
      <ActionCard
        icon={<Compass className="size-7" aria-hidden />}
        title="Faisons connaissance"
        text="Une dizaine de questions qui s'adaptent à tes réponses, pour comprendre qui tu es et ce que tu veux construire, où que tu vives."
        href="/diagnostic"
        cta="Commencer"
        extra={live}
      />
    );
  }
  if (diagnostic.status === "in_progress") {
    return (
      <ActionCard
        icon={<Compass className="size-7" aria-hidden />}
        title="Ton diagnostic est en cours"
        text={
          diagnostic.answered === 0
            ? "Ta première question t'attend."
            : `Tu as déjà répondu à ${diagnostic.answered} question${diagnostic.answered > 1 ? "s" : ""}. Reprends là où tu en étais.`
        }
        href="/diagnostic"
        cta="Reprendre"
        extra={live}
      />
    );
  }
  if (diagnostic.status === "portrait_ready") {
    return (
      <ActionCard
        icon={<UserRound className="size-7" aria-hidden />}
        title="Ton portrait t'attend"
        text="Lis ce que j'ai compris de toi et dis-moi si c'est juste. C'est ce qui me permettra de choisir tes idées."
        href="/diagnostic"
        cta="Voir mon portrait"
        extra={live}
      />
    );
  }
  if (ideas.status === "running") {
    return (
      <ActionCard
        icon={<Sparkles className="size-7 animate-pulse motion-reduce:animate-none" aria-hidden />}
        title="Je prépare tes 3 idées"
        text="J'en imagine une douzaine, je les compare, puis j'écris le plan des trois meilleures. Ça prend une à deux minutes."
        href="/idees"
        cta="Suivre l'avancement"
      />
    );
  }
  if (ideas.status === "ready") {
    const best = ideas.ideas[0];
    return (
      <ActionCard
        icon={<Lightbulb className="size-7" aria-hidden />}
        title="Tes 3 idées sont prêtes"
        text={
          best && !best.locked
            ? `En tête : « ${best.title} ». Compare-les, puis choisis celle avec laquelle tu veux avancer.`
            : "Compare-les, puis choisis celle avec laquelle tu veux avancer."
        }
        href="/idees"
        cta="Voir mes idées"
      />
    );
  }
  return (
    <ActionCard
      icon={<Lightbulb className="size-7" aria-hidden />}
      title="Découvre tes 3 idées de business"
      text="À partir de ton portrait, je garde les trois idées qui te ressemblent le plus, chacune avec un plan pour tes 30 premiers jours."
      href="/idees"
      cta="Découvrir mes idées"
    />
  );
}

function ActionCard(props: { icon: ReactNode; title: string; text: string; href: string; cta: string; extra?: ReactNode }) {
  return (
    <Card className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">{props.icon}</span>
      <div className="flex-1">
        <h2 className="font-sans text-xl font-semibold tracking-normal">{props.title}</h2>
        <p className="mt-1 leading-relaxed text-muted-foreground">{props.text}</p>
        {props.extra}
      </div>
      <Button asChild variant="cta" className="w-full sm:w-auto">
        <Link href={props.href}>
          {props.cta} <ArrowRight aria-hidden />
        </Link>
      </Button>
    </Card>
  );
}

function ChosenIdea(props: {
  id: string;
  title: string;
  score: number | null;
  today: string;
  nextStep: { period: string; title: string; story: string; milestone: string } | undefined;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">Ton idée</p>
            <h2 className="mt-1 text-2xl leading-tight font-bold text-balance">{props.title}</h2>
          </div>
          {props.score !== null && <ScoreRing score={props.score} size="md" />}
        </div>
        <div className="bg-accent px-5 py-5 text-accent-foreground sm:px-7">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Flag className="size-4" aria-hidden /> Aujourd&apos;hui
          </p>
          <p className="mt-1.5 text-lg leading-relaxed">{props.today}</p>
        </div>
        {props.nextStep && (
          <div className="flex flex-col gap-2 px-5 py-5 sm:px-7">
            <p className="text-sm font-semibold text-primary">Ensuite · {props.nextStep.period}</p>
            <p className="font-semibold">{props.nextStep.title}</p>
            <p className="leading-relaxed text-muted-foreground">{props.nextStep.story}</p>
            <p className="mt-1 flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              {props.nextStep.milestone}
            </p>
          </div>
        )}
        <div className="border-t border-border px-5 py-4 sm:px-7">
          <Button asChild variant="primary">
            <Link href={`/idees/${props.id}#plan`}>
              Voir tout mon plan <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Shortcut({ href, icon, label, text }: { href: string; icon: ReactNode; label: string; text: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-card border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-muted-foreground">{label}</span>
        <span className="mt-0.5 block leading-snug font-medium">{text}</span>
      </span>
      <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
