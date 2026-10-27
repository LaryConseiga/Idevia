"use client";

import { Check, ExternalLink, Lock, Megaphone, Radar, RefreshCw, Search, Sparkles, Store, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HypothesisStatus } from "@/server/dal/projects";
import type { Level } from "@/server/market/field-check";
import type { FieldView, HypothesisView, SourceView } from "@/server/projects/view";
import { joinWaitlistAction } from "../idees/actions";
import { fieldCheckAction, hypothesisAction } from "./actions";

export function FieldSection({ field, locked }: { field: FieldView; locked: boolean }) {
  if (field.status === "unavailable") return null;
  return (
    <section aria-labelledby="terrain" className="flex flex-col gap-5">
      <div>
        <h2 id="terrain" className="text-2xl font-bold">
          Le terrain
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Ce que disent de vraies données, collectées pour ton idée.</p>
      </div>
      {locked ? (
        <LockedField />
      ) : field.status === "none" ? (
        <StartCheck quotaLeft={field.quotaLeft} />
      ) : field.status === "running" ? (
        <Running startedAt={field.startedAt} />
      ) : field.status === "failed" ? (
        <Failed message={field.message} quotaLeft={field.quotaLeft} />
      ) : (
        <Report field={field} />
      )}
    </section>
  );
}

function useCheck() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      setError(null);
      try {
        const result = await fieldCheckAction();
        if (!result.ok) setError(result.error);
      } catch {
        setError("Connexion perdue. Réessaie dans un instant.");
      }
    });
  return { run, pending, error };
}

const quotaText = (n: number) =>
  n === 0 ? "Tu as utilisé tes vérifications de ce mois-ci." : `Il te reste ${n} vérification${n > 1 ? "s" : ""} ce mois-ci.`;

function StartCheck({ quotaLeft }: { quotaLeft: number }) {
  const { run, pending, error } = useCheck();
  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Radar className="size-6" aria-hidden />
      </span>
      <div>
        <h3 className="font-sans text-xl font-semibold tracking-normal">Avant de te lancer, regarde ce que dit le terrain</h3>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Je cherche qui vend déjà près de toi, ce que les gens tapent sur Google et qui fait de la publicité sur ce créneau.
          Puis je te dis ce que ça montre, avec les sources, et trois choses simples à vérifier toi-même cette semaine.
          Compte une à deux minutes.
        </p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="cta" onClick={run} disabled={pending || quotaLeft === 0} aria-busy={pending}>
          {pending ? "Un instant…" : "Vérifier mon idée sur le terrain"}
        </Button>
        <p className="text-sm text-muted-foreground">{quotaText(quotaLeft)}</p>
      </div>
    </Card>
  );
}

const PHASES = [
  { after: 0, icon: Search, text: "Je regarde ce que les gens cherchent sur Google…" },
  { after: 15, icon: Store, text: "Je repère les commerces qui font déjà ce métier…" },
  { after: 45, icon: Megaphone, text: "Je cherche qui fait de la publicité sur ce créneau…" },
  { after: 80, icon: Sparkles, text: "Je lis tout ça pour toi…" },
];

function Running({ startedAt }: { startedAt: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(() => Math.max(0, (Date.now() - Date.parse(startedAt)) / 1000));

  // La collecte tourne côté serveur : on rafraîchit la page pour récupérer le rapport.
  useEffect(() => {
    const tick = setInterval(() => setElapsed((Date.now() - Date.parse(startedAt)) / 1000), 1000);
    const poll = setInterval(() => router.refresh(), 5000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [router, startedAt]);

  const phase = [...PHASES].reverse().find((p) => elapsed >= p.after) ?? PHASES[0];
  const progress = Math.min(95, Math.round((elapsed / 110) * 100));
  const Icon = phase.icon;
  return (
    <Card className="p-6 sm:p-8">
      <Icon className="size-8 animate-pulse text-primary motion-reduce:animate-none" aria-hidden />
      <p className="mt-4 text-lg font-semibold" aria-live="polite">
        {phase.text}
      </p>
      <div
        className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avancement de la vérification"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear motion-reduce:transition-none" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-5 text-sm text-muted-foreground">Tu peux fermer cette page : le rapport t&apos;attendra ici.</p>
    </Card>
  );
}

function Failed({ message, quotaLeft }: { message: string; quotaLeft: number }) {
  const { run, pending, error } = useCheck();
  return (
    <Card className="flex flex-col gap-4 p-6 sm:p-8">
      <Alert tone="warning">{message} Cette tentative n&apos;est pas décomptée.</Alert>
      {error && <Alert tone="error">{error}</Alert>}
      {quotaLeft > 0 && (
        <Button variant="primary" className="self-start" onClick={run} disabled={pending} aria-busy={pending}>
          <RefreshCw aria-hidden /> {pending ? "Un instant…" : "Réessayer"}
        </Button>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- Rapport

const LEVEL_LABELS: Record<Level, string> = { forte: "Forte", moyenne: "Moyenne", faible: "Faible", incertaine: "Incertaine" };

/** Une demande forte est une bonne nouvelle ; une concurrence forte, un point de vigilance. */
function levelTone(kind: "demand" | "competition", level: Level) {
  if (level === "incertaine" || level === "moyenne") return "bg-muted text-foreground";
  const good = kind === "demand" ? level === "forte" : level === "faible";
  return good ? "bg-success-soft text-success" : "bg-highlight-soft text-highlight";
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function Report({ field }: { field: Extract<FieldView, { status: "ready" }> }) {
  const { report, sources, hypotheses } = field;
  const { run, pending, error } = useCheck();
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5 p-6 sm:p-8">
        <p className="text-xs font-medium text-muted-foreground">Vérifié le {dateFormat.format(new Date(field.completedAt))}</p>
        <p className="text-xl leading-snug font-semibold text-balance">{report.headline}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["demand", "La demande", report.demand],
              ["competition", "La concurrence", report.competition],
            ] as const
          ).map(([kind, label, value]) => (
            <div key={kind} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-sans text-base font-semibold tracking-normal">{label}</h3>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", levelTone(kind, value.level))}>
                  {LEVEL_LABELS[value.level]}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.text}</p>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h3 className="font-sans text-lg font-semibold tracking-normal">Ce que montre le terrain</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {report.findings.map((f) => (
            <li key={f.text} className="flex items-start gap-3">
              <a
                href={`#source-${f.source}`}
                className="mt-0.5 inline-flex min-h-6 shrink-0 items-center rounded-md bg-primary-soft px-2 text-xs font-semibold text-primary"
                aria-label={`Source ${f.source}`}
              >
                {f.source}
              </a>
              <p className="leading-relaxed">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-card border border-primary/25 bg-primary-soft/50 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-sans text-lg font-semibold tracking-normal">
          <Target className="size-5 text-primary" aria-hidden /> Ton angle pour te démarquer
        </h3>
        <p className="mt-2 leading-relaxed">{report.angle}</p>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold tracking-normal">À vérifier toi-même cette semaine</h3>
        <p className="mt-1 text-sm text-muted-foreground">Note où tu en es : c&apos;est ce qui transforme une idée en projet solide.</p>
        <ol className="mt-4 flex flex-col gap-3">
          {hypotheses.map((h, i) => (
            <HypothesisCard key={h.id} index={i + 1} hypothesis={h} />
          ))}
        </ol>
      </div>

      <div>
        <h3 className="font-sans text-lg font-semibold tracking-normal">Sources</h3>
        <ol className="mt-3 flex flex-col gap-3">
          {sources.map((s) => (
            <SourceCard key={s.n} source={s} />
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">{report.caveat}</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {field.quotaLeft > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="secondary" onClick={run} disabled={pending} aria-busy={pending}>
            <RefreshCw aria-hidden /> {pending ? "Un instant…" : "Refaire une vérification"}
          </Button>
          <p className="text-sm text-muted-foreground">{quotaText(field.quotaLeft)}</p>
        </div>
      )}
    </div>
  );
}

const STATUSES: { value: HypothesisStatus; label: string }[] = [
  { value: "untested", label: "À tester" },
  { value: "testing", label: "En cours" },
  { value: "confirmed", label: "Confirmé" },
  { value: "invalidated", label: "Pas confirmé" },
];

function HypothesisCard({ index, hypothesis }: { index: number; hypothesis: HypothesisView }) {
  const [status, setStatus] = useOptimistic(hypothesis.status);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const choose = (value: HypothesisStatus) =>
    start(async () => {
      setError(null);
      setStatus(value);
      try {
        const result = await hypothesisAction(hypothesis.id, value);
        if (!result.ok) setError(result.error);
      } catch {
        setError("Connexion perdue. Réessaie dans un instant.");
      }
    });

  return (
    <li>
      <Card className="flex flex-col gap-3 p-5">
        <p className="font-semibold">
          <span className="text-primary">{index}. </span>
          {hypothesis.hypothesis}
        </p>
        {hypothesis.test && (
          <p className="leading-relaxed">
            <span className="font-semibold">Le test : </span>
            {hypothesis.test}
          </p>
        )}
        {hypothesis.success && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">C&apos;est confirmé si : </span>
            {hypothesis.success}
          </p>
        )}
        <div role="radiogroup" aria-label="Où en es-tu ?" className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={status === s.value}
              onClick={() => choose(s.value)}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
                status === s.value
                  ? s.value === "confirmed"
                    ? "border-success bg-success-soft text-success"
                    : s.value === "invalidated"
                      ? "border-highlight bg-highlight-soft text-highlight"
                      : "border-primary bg-primary-soft text-primary"
                  : "border-border hover:bg-muted",
              )}
            >
              {status === s.value && <Check className="size-4" aria-hidden />}
              {s.label}
            </button>
          ))}
        </div>
        {error && <Alert tone="error">{error}</Alert>}
      </Card>
    </li>
  );
}

const externalLink = "inline-flex items-center gap-1 font-medium text-primary hover:underline";

function SourceCard({ source }: { source: SourceView }) {
  return (
    <li id={`source-${source.n}`} className="scroll-mt-24">
      <details className="group rounded-card border border-border bg-card p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
          <span className="mt-0.5 inline-flex min-h-6 shrink-0 items-center rounded-md bg-primary-soft px-2 text-xs font-semibold text-primary">
            {source.n}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{source.label}</span>
            <span className="block text-sm text-muted-foreground">
              « {source.query} » · collecté le {dateFormat.format(new Date(source.collectedAt))}
            </span>
          </span>
        </summary>
        <div className="mt-3 flex flex-col gap-3 text-sm">
          <SourceDetails source={source} />
          <p className="text-muted-foreground">{source.limits}</p>
          <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className={externalLink}>
            Voir la source <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </details>
    </li>
  );
}

function SourceDetails({ source }: { source: SourceView }) {
  switch (source.kind) {
    case "local_competition": {
      const p = source.payload;
      if (!p.count) return <p>Aucun commerce trouvé sur Google Maps pour cette recherche.</p>;
      return (
        <>
          <p>
            {p.count} commerce{p.count > 1 ? "s" : ""} trouvé{p.count > 1 ? "s" : ""}
            {p.averageRating !== null && `, note moyenne ${p.averageRating.toLocaleString("fr-FR")} sur 5`}.
          </p>
          <ul className="flex flex-col gap-1.5">
            {p.places.map((place) => (
              <li key={place.name} className="flex justify-between gap-3 border-b border-border pb-1.5 last:border-0">
                <span className="min-w-0">
                  <span className="font-medium">{place.name}</span>
                  <span className="text-muted-foreground">{[place.category, place.area].filter(Boolean).map((x) => ` · ${x}`)}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {place.rating !== null ? `${place.rating.toLocaleString("fr-FR")} ★ (${place.reviews})` : "sans avis"}
                </span>
              </li>
            ))}
          </ul>
        </>
      );
    }
    case "search_demand": {
      const p = source.payload;
      return (
        <>
          {p.related.length > 0 && (
            <div>
              <p className="font-medium">Ce que les gens cherchent aussi</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {p.related.map((r) => (
                  <li key={r} className="rounded-full bg-muted px-2.5 py-1">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.results.length > 0 && (
            <div>
              <p className="font-medium">Les premiers résultats</p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {p.results.map((r) => (
                  <li key={r.url}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className={externalLink}>
                      {r.title}
                    </a>
                    <span className="text-muted-foreground"> · {r.domain}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      );
    }
    case "ads": {
      const p = source.payload;
      if (!p.count) return <p>Aucune publicité active trouvée pour ces mots-clés.</p>;
      return (
        <>
          <p>
            {p.count} publicité{p.count > 1 ? "s" : ""} active{p.count > 1 ? "s" : ""}, de {p.advertisers} annonceur
            {p.advertisers > 1 ? "s" : ""}.
          </p>
          <ul className="flex flex-col gap-2">
            {p.ads.map((ad, i) => (
              <li key={`${ad.advertiser}-${i}`} className="border-b border-border pb-2 last:border-0">
                <span className="font-medium">{ad.advertiser}</span>
                {ad.since && <span className="text-muted-foreground"> · depuis le {dateFormat.format(new Date(ad.since))}</span>}
                <p className="mt-0.5 line-clamp-2 text-muted-foreground">{ad.text}</p>
              </li>
            ))}
          </ul>
        </>
      );
    }
  }
}

function LockedField() {
  const [joined, setJoined] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Card className="flex flex-col items-start gap-4 p-6 sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-highlight-soft text-highlight">
        <Lock className="size-6" aria-hidden />
      </span>
      <h3 className="font-sans text-xl font-semibold tracking-normal">Le suivi et la vérification terrain arrivent avec l&apos;offre Pro</h3>
      <p className="leading-relaxed text-muted-foreground">
        Concurrents réels, recherches, publicités en cours, hypothèses à tester et suivi de ton plan, étape par étape.
      </p>
      {joined ? (
        <Alert tone="success">C&apos;est noté : tu seras parmi les premiers prévenus.</Alert>
      ) : (
        <Button
          variant="cta"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await joinWaitlistAction();
              if (result.ok) setJoined(true);
            })
          }
        >
          Me prévenir à l&apos;ouverture
        </Button>
      )}
    </Card>
  );
}
