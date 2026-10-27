import {
  ArrowRight,
  Check,
  Compass,
  ListChecks,
  Lock,
  MapPin,
  MessageCircle,
  Quote,
  Smartphone,
  Sprout,
  Target,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const steps = [
  {
    icon: MessageCircle,
    title: "Un échange, pas un formulaire",
    text: "Idevia te pose une question à la fois et choisit la suivante selon ce que tu viens de répondre. Comme un mentor qui t'écoute vraiment.",
  },
  {
    icon: Compass,
    title: "Des idées faites pour toi",
    text: "Trois idées adaptées à tes compétences, ton budget, ton temps et ta ville, avec pour chacune la raison pour laquelle elle te correspond.",
  },
  {
    icon: ListChecks,
    title: "Un plan pour avancer",
    text: "Un plan de 30 jours découpé en actions concrètes : parler à des clients, tester un prix, réaliser une première vente.",
  },
];

const promises = [
  {
    icon: MapPin,
    title: "Ancré dans ton marché",
    text: "Budgets en FCFA ou dans ta devise, canaux qui marchent chez toi (WhatsApp, Mobile Money, vente de proximité), concurrents réels de ta ville.",
  },
  {
    icon: Target,
    title: "Honnête sur l'incertain",
    text: "Chaque chiffre est marqué : donnée sourcée et datée, estimation ou hypothèse à vérifier. Aucune promesse de revenus.",
  },
  {
    icon: Sprout,
    title: "Il avance avec toi",
    text: "Ton plan s'adapte à ce que tu apprends sur le terrain. L'assistant connaît ton projet et t'aide sur la prochaine étape.",
  },
  {
    icon: Smartphone,
    title: "Pensé pour ton téléphone",
    text: "Léger, rapide même avec une connexion faible, et installable sur ton téléphone ou ton ordinateur comme une application.",
  },
];

const faqs = [
  {
    q: "Est-ce que c'est gratuit ?",
    a: "Oui. Le diagnostic, les idées, le plan d'action et un quota mensuel d'échanges avec l'assistant sont gratuits. Une offre Pro viendra plus tard pour aller plus loin.",
  },
  {
    q: "Je n'ai aucune idée de départ, est-ce pour moi ?",
    a: "Oui, c'est même le point de départ le plus courant. L'échange part de ce que tu sais faire, de ce qui t'intéresse et de tes moyens réels.",
  },
  {
    q: "Et si j'ai déjà une idée ?",
    a: "Dis-le dès le début : Idevia t'aidera à la confronter à ton profil et à ton marché, puis à la tester avant d'engager de l'argent.",
  },
  {
    q: "Idevia garantit-il que mon business va marcher ?",
    a: "Non, et personne ne peut le garantir. Idevia t'aide à réfléchir, à tester tes hypothèses à petit coût et à décider. Il ne remplace pas un conseil juridique, comptable ou financier.",
  },
  {
    q: "Que faites-vous de mes réponses ?",
    a: "Elles servent uniquement à te conseiller. Elles sont chiffrées, ne sont jamais vendues, et l'IA ne reçoit ni ton nom ni ton email. Tu peux exporter ou supprimer tes données à tout moment.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[36rem] max-w-5xl rounded-full bg-[radial-gradient(closest-side,var(--primary-soft),transparent)] opacity-90"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
              <Sprout className="size-4" aria-hidden />
              Pour les entrepreneurs d&apos;Afrique francophone
            </p>
            <h1 className="mt-5 text-4xl font-extrabold sm:text-5xl lg:text-6xl">
              Trouve <span className="text-primary">ton</span> idée de business. Puis passe à l&apos;action.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Idevia apprend à te connaître, te propose des idées qui collent à ta vie réelle — tes compétences, ton
              budget, ta ville — et t&apos;accompagne avec un plan concret, étape par étape.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="cta" size="lg">
                <Link href="/diagnostic">
                  Commencer mon diagnostic
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/comment-ca-marche">Voir comment ça marche</Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {["Gratuit", "10 minutes environ", "Sans compte pour commencer"].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-success" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <ConversationPreview />
        </div>
      </section>

      {/* Comment ça marche */}
      <section aria-labelledby="etapes" className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 id="etapes" className="max-w-2xl text-3xl font-bold sm:text-4xl">
            De « je ne sais pas quoi lancer » à ta première action, en trois temps
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="relative rounded-card border border-border bg-background p-6">
                <span className="font-display text-sm font-bold text-accent">Étape {i + 1}</span>
                <step.icon className="mt-4 size-8 text-primary" aria-hidden />
                <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Exemple de résultat */}
      <section aria-labelledby="exemple" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 id="exemple" className="text-3xl font-bold sm:text-4xl">
              Une idée qui t&apos;explique pourquoi elle est pour toi
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Chaque idée détaille le client visé, le budget de départ, les risques et les premières actions pour la
              tester. Le score de compatibilité se décompose critère par critère : ce n&apos;est jamais une
              probabilité de réussite.
            </p>
            <Button asChild variant="link" className="mt-4 px-0">
              <Link href="/fonctionnalites">
                Tout ce que contient une fiche idée <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <IdeaPreview />
        </div>
      </section>

      {/* Promesses */}
      <section aria-labelledby="promesses" className="bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 id="promesses" className="max-w-2xl text-3xl font-bold sm:text-4xl">
            Conçu pour la réalité du terrain
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {promises.map((item) => (
              <Card key={item.title} className="flex gap-4 p-6">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <item.icon className="size-6" aria-hidden />
                </span>
                <div>
                  <h3 className="font-sans text-lg font-semibold tracking-normal">{item.title}</h3>
                  <p className="mt-1 text-muted-foreground">{item.text}</p>
                </div>
              </Card>
            ))}
          </div>
          <p className="mt-8 inline-flex items-start gap-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            Tes réponses sont chiffrées, jamais revendues, et tu peux tout exporter ou supprimer quand tu veux.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <h2 id="faq" className="text-3xl font-bold sm:text-4xl">
          Questions fréquentes
        </h2>
        <div className="mt-8 divide-y divide-border rounded-card border border-border bg-card">
          {faqs.map((item) => (
            <details key={item.q} className="group px-5 py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="text-xl text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-4 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.5rem] bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold sm:text-4xl">
            Ta prochaine décision utile commence par une question
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
            Réponds à ton rythme. Tu pourras créer ton compte à la fin pour sauvegarder ton profil et tes idées.
          </p>
          <Button asChild variant="cta" size="lg" className="mt-8">
            <Link href="/diagnostic">
              Trouver mon idée <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

/** Aperçu statique de l'entretien adaptatif (illustration, pas de données réelles). */
function ConversationPreview() {
  return (
    <Card className="relative mx-auto w-full max-w-md p-5 sm:p-6" aria-label="Exemple d'échange avec Idevia">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Ton diagnostic</span>
        <span className="text-muted-foreground">Question 4</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full w-2/5 rounded-full bg-primary" />
      </div>

      <div className="mt-6 space-y-4 text-[15px]">
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary-soft px-4 py-3">
          Je fais de la pâtisserie pour la famille et les voisins commandent souvent.
        </p>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3">
          <p>
            Tes voisins commandent déjà : c&apos;est un vrai signal. Quand ils te commandent, c&apos;est plutôt pour…
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Je te demande ça pour savoir quel type de client paie déjà pour ton savoir-faire.
          </p>
        </div>
        <div className="grid gap-2" aria-hidden>
          {["Des fêtes et événements", "Le goûter de tous les jours", "Des cadeaux", "Je ne sais pas encore"].map(
            (option, i) => (
              <span
                key={option}
                className={
                  i === 0
                    ? "rounded-xl border-2 border-primary bg-primary-soft px-4 py-2.5 font-medium"
                    : "rounded-xl border border-border px-4 py-2.5 text-muted-foreground"
                }
              >
                {option}
              </span>
            ),
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Exemple illustratif</p>
    </Card>
  );
}

/** Aperçu statique d'une fiche idée (exemple fictif, clairement signalé). */
function IdeaPreview() {
  const criteria = [
    { label: "Compétences", value: 90 },
    { label: "Budget", value: 75 },
    { label: "Temps disponible", value: 70 },
    { label: "Marché local", value: 65 },
  ];
  return (
    <Card className="p-6" aria-label="Exemple de fiche idée">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">Exemple fictif · Ouagadougou</p>
          <h3 className="mt-1 text-2xl font-bold">Gâteaux d&apos;événements sur commande WhatsApp</h3>
        </div>
        <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <span className="font-display text-xl leading-none font-bold">76</span>
          <span className="text-[10px] font-medium">/ 100</span>
        </span>
      </div>

      <dl className="mt-5 space-y-2.5">
        {criteria.map((c) => (
          <div key={c.label} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm">
            <dt className="text-muted-foreground">{c.label}</dt>
            <dd className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${c.value}%` }} />
            </dd>
            <dd className="text-right font-medium tabular-nums">{c.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-xl bg-highlight-soft p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Quote className="size-4 text-highlight" aria-hidden /> Pourquoi toi
        </p>
        <p className="mt-1 text-sm">
          Tu as dit que tes voisins commandent déjà et que tu peux y consacrer tes week-ends : tu peux tester avec de
          vrais clients dès cette semaine, sans louer de local.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-primary-soft px-2.5 py-1 font-medium text-primary">Donnée sourcée</span>
        <span className="rounded-full bg-highlight-soft px-2.5 py-1 font-medium">Estimation</span>
        <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">Hypothèse à vérifier</span>
      </div>
    </Card>
  );
}
