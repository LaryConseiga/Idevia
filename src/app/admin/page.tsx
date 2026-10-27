import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAiUsage, getMarketUsage, getOverview } from "@/server/dal/admin";
import { requireAdmin } from "@/server/dal/session";
import { apifyUsage } from "@/server/market/apify";

export const metadata: Metadata = { title: "Vue d'ensemble" };

const int = new Intl.NumberFormat("fr-FR");
const usd = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %` : "–");

const TASK_LABELS: Record<string, string> = {
  interview: "Entretien",
  portrait: "Portrait",
  ideation: "Idées (ancrage)",
  ideation_alt: "Idées (audace)",
  judge: "Notation",
  plan: "Rédaction des fiches",
  validation: "Terrain",
  assistant: "Coach",
};

/** Agrégats uniquement : aucune donnée personnelle n'apparaît sur cette page. */
export default async function AdminOverviewPage() {
  await requireAdmin();
  const [overview, ai, market, apify] = await Promise.all([getOverview(), getAiUsage(30), getMarketUsage(), apifyUsage()]);
  const top = overview.funnel[0].count;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Vue d&apos;ensemble</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Comptes" value={int.format(overview.users.total)} hint={`+${int.format(overview.users.last7)} en 7 jours`} />
        <Stat label="Emails vérifiés" value={pct(overview.users.verified, overview.users.total)} hint={`${int.format(overview.users.verified)} comptes`} />
        <Stat label="Liste d'attente Pro" value={int.format(overview.waitlist)} hint="intéressés par l'offre payante" />
        <Stat
          label="Suspensions / suppressions"
          value={`${int.format(overview.users.banned)} / ${int.format(overview.pendingDeletions)}`}
          hint="comptes suspendus / suppressions en attente"
        />
      </div>

      <section aria-labelledby="entonnoir">
        <h2 id="entonnoir" className="text-xl font-bold">
          Parcours
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Comptes ayant atteint chaque étape, depuis le lancement.</p>
        <Card className="mt-4 flex flex-col gap-3 p-5">
          {overview.funnel.map((step, i) => {
            const width = top ? Math.max(2, Math.round((step.count / top) * 100)) : 0;
            const previous = i > 0 ? overview.funnel[i - 1].count : null;
            return (
              <div key={step.label} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="font-medium">{step.label}</span>
                <span className="h-3 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                </span>
                <span className="w-28 text-right tabular-nums">
                  {int.format(step.count)}
                  {previous !== null && <span className="text-muted-foreground"> · {pct(step.count, previous)}</span>}
                </span>
              </div>
            );
          })}
        </Card>
      </section>

      <section aria-labelledby="activite">
        <h2 id="activite" className="text-xl font-bold">
          Activité
        </h2>
        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Action</th>
                <th className="px-4 py-2.5 text-right font-semibold">Ce mois-ci</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {overview.activity.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <td className="px-4 py-2.5">{row.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{int.format(row.month)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{int.format(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="couts" className="flex flex-col gap-4">
        <div>
          <h2 id="couts" className="text-xl font-bold">
            Modèles d&apos;IA et données de marché
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">30 derniers jours. Tout est en offre gratuite : le coût réel est le quota consommé.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Crédit Apify du mois"
            value={apify ? `${usd.format(apify.usedUsd)} / ${usd.format(apify.maxUsd)}` : "indisponible"}
            hint={apify ? `arrêt automatique à 90 %${apify.cycleEnd ? `, renouvelé le ${new Date(apify.cycleEnd).toLocaleDateString("fr-FR")}` : ""}` : "jeton Apify absent"}
            alert={apify ? apify.usedUsd >= apify.maxUsd * 0.75 : false}
          />
          <Stat label="Collectes Apify ce mois-ci" value={int.format(market.runs)} hint={`≈ ${usd.format(market.estimatedUsd)} estimés`} />
          <Stat label="Signaux en cache" value={int.format(market.cached)} hint="réutilisés gratuitement pendant 30 jours" />
        </div>

        <div className="overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Voie</th>
                <th className="px-4 py-2.5 font-semibold">Modèle</th>
                <th className="px-4 py-2.5 text-right font-semibold">Appels</th>
                <th className="px-4 py-2.5 text-right font-semibold">Échecs</th>
                <th className="px-4 py-2.5 text-right font-semibold">Tokens</th>
                <th className="px-4 py-2.5 text-right font-semibold">Latence moy.</th>
              </tr>
            </thead>
            <tbody>
              {ai.byProvider.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Aucun appel sur la période.
                  </td>
                </tr>
              )}
              {ai.byProvider.map((row) => {
                const failureRate = row.calls ? row.failures / row.calls : 0;
                return (
                  <tr key={`${row.provider}-${row.model}`} className="border-t border-border">
                    <td className="px-4 py-2.5 font-medium">{row.provider}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.model}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{int.format(row.calls)}</td>
                    <td className={cn("px-4 py-2.5 text-right tabular-nums", failureRate > 0.25 && "font-semibold text-highlight")}>
                      {pct(row.failures, row.calls)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{int.format(row.tokens)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{(row.avgMs / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-sans text-base font-semibold tracking-normal">Par fonctionnalité</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {ai.byTask.map((row) => (
                <li key={row.task} className="flex justify-between gap-3">
                  <span>{TASK_LABELS[row.task] ?? row.task}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {int.format(row.calls)} appels · {int.format(row.tokens)} tokens · {pct(row.failures, row.calls)} d&apos;échecs
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-sans text-base font-semibold tracking-normal">Causes d&apos;échec les plus fréquentes</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              rate_limited : quota gratuit atteint ; timeout : modèle trop lent ; invalid_output : réponse hors format.
            </p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {ai.topErrors.length === 0 && <li className="text-muted-foreground">Aucun échec.</li>}
              {ai.topErrors.map((e) => (
                <li key={e.code} className="flex justify-between gap-3">
                  <code className="text-xs">{e.code}</code>
                  <span className="tabular-nums">{int.format(e.count)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint, alert }: { label: string; value: string; hint?: string; alert?: boolean }) {
  return (
    <Card className={cn("p-5", alert && "border-highlight/50")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", alert && "text-highlight")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
