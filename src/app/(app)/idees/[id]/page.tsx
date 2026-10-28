import { ArrowLeft, CheckCircle2, Clock, Flag, Globe2, Lock, ShieldAlert, Sparkles, Target, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RANK_LABELS, ScoreRing } from "@/components/ideas/score-ring";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/server/dal/session";
import { getIdeaDetail } from "@/server/ideas/service";
import { ChooseIdea } from "./choose-idea";

export const metadata: Metadata = { title: "Ton idée" };

export default async function IdeaPage({ params }: PageProps<"/idees/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/idees/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const idea = await getIdeaDetail(user.id, id);
  if (!idea) notFound();
  if (idea === "locked") return <Locked />;

  const { content } = idea;
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 pb-24 md:pb-0">
      <Link href="/idees" className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Mes idées
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              n°{idea.rank} · {RANK_LABELS[idea.rank]}
            </span>
            {idea.nature && (
              <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                {idea.nature}
              </span>
            )}
            {idea.reach && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Globe2 className="size-3.5" aria-hidden /> {idea.reach}
              </span>
            )}
          </span>
          {idea.score !== null && <ScoreRing score={idea.score} size="lg" />}
        </div>
        <h1 className="text-3xl leading-tight font-bold text-balance sm:text-4xl">{content.title}</h1>
        <p className="text-xl leading-relaxed text-balance">{content.hook}</p>
        <p className="leading-relaxed text-muted-foreground">{content.summary}</p>
      </header>

      <section aria-labelledby="pourquoi" className="rounded-card border border-primary/25 bg-primary-soft/50 p-5 sm:p-7">
        <h2 id="pourquoi" className="flex items-center gap-2 font-sans text-lg font-semibold tracking-normal">
          <Sparkles className="size-5 text-primary" aria-hidden /> Pourquoi c&apos;est fait pour toi
        </h2>
        <p className="mt-3 text-[1.05rem] leading-relaxed">{content.whyYou}</p>
      </section>

      <section aria-labelledby="en-clair">
        <h2 id="en-clair" className="text-2xl font-bold">L&apos;idée en clair</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { label: "Ce que tu vends", value: content.offer.what },
            { label: "À qui", value: content.offer.forWhom },
            { label: "À quel prix", value: content.offer.price },
            { label: "Où le vendre", value: content.offer.where },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 leading-relaxed">{value}</dd>
            </div>
          ))}
        </dl>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Wallet, label: "Pour démarrer", value: content.numbers.startBudget },
            { icon: Clock, label: "Ton temps", value: content.numbers.timePerWeek },
            { icon: Target, label: "Premier objectif", value: content.numbers.firstGoal },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl bg-muted/60 p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="aujourdhui" className="rounded-card bg-accent p-5 text-accent-foreground sm:p-7">
        <h2 id="aujourdhui" className="flex items-center gap-2 font-sans text-lg font-semibold tracking-normal">
          <Flag className="size-5" aria-hidden /> Ta première action, aujourd&apos;hui
        </h2>
        <p className="mt-2 text-lg leading-relaxed">{content.todayAction}</p>
      </section>

      <section aria-labelledby="plan">
        <h2 id="plan" className="text-2xl font-bold">Ton plan pour les 30 premiers jours</h2>
        <ol className="mt-6 flex flex-col">
          {content.plan.map((step, i) => (
            <li key={step.period + step.title} className="relative flex gap-4 pb-8 last:pb-0">
              {i < content.plan.length - 1 && <span aria-hidden className="absolute top-10 bottom-0 left-[1.1875rem] w-0.5 bg-border" />}
              <span className="z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div className="flex-1 pt-1">
                <p className="text-sm font-semibold text-primary">{step.period}</p>
                <h3 className="mt-0.5 font-sans text-lg font-semibold tracking-normal">{step.title}</h3>
                <p className="mt-2 leading-relaxed">{step.story}</p>
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span>
                    <span className="font-semibold">À la fin : </span>
                    {step.milestone}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {content.watchouts.length > 0 && (
        <section aria-labelledby="pieges">
          <h2 id="pieges" className="text-2xl font-bold">Les pièges à éviter</h2>
          <div className="mt-4 flex flex-col gap-3">
            {content.watchouts.map((w) => (
              <Card key={w.risk} className="flex gap-3 p-4 sm:p-5">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-highlight" aria-hidden />
                <p className="leading-relaxed">
                  <span className="font-semibold">{w.risk}. </span>
                  {w.answer}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {idea.breakdown && (
        <section aria-labelledby="score">
          <h2 id="score" className="text-2xl font-bold">Pourquoi ce score</h2>
          <p className="mt-1 text-sm text-muted-foreground">Chaque idée est notée sur six critères, pour toi et pour le marché qu&apos;elle vise.</p>
          <ul className="mt-4 flex flex-col gap-3">
            {idea.breakdown.map((c) => (
              <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[14rem_minmax(0,1fr)_3rem]">
                <span className="text-sm">{c.label}</span>
                <span className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-muted sm:order-none sm:col-span-1">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${c.value}%` }} />
                </span>
                <span className="text-right text-sm font-semibold tabular-nums">{c.value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ChooseIdea ideaId={idea.id} selected={idea.selected} />
    </article>
  );
}

function Locked() {
  return (
    <Card className="mx-auto flex max-w-xl flex-col items-start gap-4 p-6 sm:p-8">
      <Lock className="size-8 text-highlight" aria-hidden />
      <h1 className="text-2xl font-bold">Cette idée fait partie de l&apos;offre Pro</h1>
      <p className="leading-relaxed text-muted-foreground">
        Tes deux meilleures idées, leur plan détaillé et le suivi arrivent avec l&apos;offre Pro. Tu peux déjà
        explorer ta troisième idée en entier.
      </p>
      <Button asChild variant="secondary">
        <Link href="/idees">Revenir à mes idées</Link>
      </Button>
    </Card>
  );
}
