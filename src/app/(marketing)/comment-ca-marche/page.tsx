import { ArrowRight, Bell, Compass, Lightbulb, ListChecks, MessageCircle, Radar } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/marketing/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description:
    "Un entretien qui s'adapte à toi, 3 idées classées, une vérification sur le terrain, un plan de 30 jours et un coach : le parcours Idevia, étape par étape.",
  alternates: { canonical: "/comment-ca-marche" },
};

const steps = [
  {
    icon: Compass,
    title: "On fait connaissance",
    time: "10 minutes",
    text: "Une question à la fois, choisie selon ta réponse précédente : ce que tu sais faire, ce qui t'attire, ton budget, ton temps, où tu vis et où tu imagines tes clients. À la fin, Idevia te montre ce qu'il a compris de toi, et tu peux corriger.",
  },
  {
    icon: Lightbulb,
    title: "Tu reçois 3 idées, classées",
    time: "1 à 2 minutes",
    text: "Plusieurs modèles d'IA imaginent une douzaine d'idées, un autre les note sur six critères (tes compétences, la demande, tes moyens, ta motivation, la rapidité, le risque), puis les trois meilleures sont rédigées : pourquoi elle te correspond, l'offre, les chiffres de départ et le plan.",
  },
  {
    icon: Radar,
    title: "Tu la vérifies sur le terrain",
    time: "1 à 2 minutes",
    text: "Idevia regarde ce qui existe vraiment : les commerces concurrents sur Google Maps, ce que les gens cherchent sur Google, qui fait déjà de la publicité. Tu obtiens un constat sourcé et daté, un angle pour te démarquer et trois hypothèses à tester toi-même.",
  },
  {
    icon: ListChecks,
    title: "Tu avances, étape par étape",
    time: "30 jours",
    text: "Ton plan devient une liste d'actions datées. Une seule chose à faire à la fois, que tu coches quand c'est fait. La première ne coûte rien et prend moins de 30 minutes.",
  },
  {
    icon: MessageCircle,
    title: "Ton coach t'accompagne",
    time: "quand tu veux",
    text: "Il connaît ton profil, ton plan et ce qu'a montré le terrain. Tu bloques ? Il découpe l'étape. Tu dois écrire à tes premiers clients ? Il rédige le message, prêt à copier.",
  },
  {
    icon: Bell,
    title: "Un rappel au bon moment",
    time: "si tu le souhaites",
    text: "Quand une étape arrive à échéance, un email te le rappelle, pas plus d'une fois tous les trois jours. Un clic suffit pour l'arrêter.",
  },
];

export default function HowItWorksPage() {
  return (
    <PageShell
      eyebrow="Comment ça marche"
      title="De « je ne sais pas quoi lancer » à ta première vente"
      intro={<p>Six étapes, à ton rythme, depuis ton téléphone. Gratuit, sans carte bancaire.</p>}
    >
      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4 rounded-card border border-border bg-card p-5 sm:p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <step.icon className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary">
                Étape {i + 1} · {step.time}
              </p>
              <h2 className="mt-1 font-sans text-xl font-semibold tracking-normal">{step.title}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-col items-start gap-3 rounded-card bg-accent p-6 text-accent-foreground sm:p-8">
        <h2 className="font-sans text-2xl font-semibold tracking-normal">Prêt à trouver ton idée ?</h2>
        <p className="leading-relaxed">Tu peux commencer l&apos;entretien sans créer de compte.</p>
        <Button asChild className="bg-background text-foreground hover:bg-background/90">
          <Link href="/diagnostic">
            Commencer <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
