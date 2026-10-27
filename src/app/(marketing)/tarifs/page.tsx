import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/marketing/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { env } from "@/server/env";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Idevia est gratuit : diagnostic, 3 idées classées, plan de 30 jours, vérification terrain et coach. L'offre Pro arrive bientôt.",
  alternates: { canonical: "/tarifs" },
};

/** Environ 3 000 tokens par échange avec le coach, contexte du projet compris. */
const coachMessages = Math.floor(env.ASSISTANT_MONTHLY_TOKENS / 3000);

export default function PricingPage() {
  const free = [
    "Le diagnostic complet et ton portrait",
    `${env.IDEAS_MONTHLY_QUOTA} générations d'idées par mois, 3 idées classées à chaque fois`,
    "Le plan de 30 jours et son suivi",
    `${env.FIELD_CHECKS_MONTHLY_QUOTA} vérifications terrain par mois`,
    `Environ ${coachMessages} échanges avec le coach par mois`,
    "Les rappels par email",
    "L'export et la suppression de tes données",
  ];
  const pro = [
    "Plus de générations, de vérifications et d'échanges avec le coach",
    "Des modèles d'IA payants qui n'utilisent jamais tes données pour s'entraîner",
    "Un suivi plus poussé de ton projet dans la durée",
    "Paiement par Mobile Money ou carte, sans abonnement imposé",
  ];
  return (
    <PageShell
      eyebrow="Tarifs"
      title="Gratuit pour commencer, vraiment"
      intro={<p>Pas de carte bancaire, pas d&apos;essai limité dans le temps. Les quotas mensuels permettent de garder Idevia gratuit pour tout le monde.</p>}
      wide
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="flex flex-col gap-5 border-primary/40 p-6 ring-1 ring-primary/20 sm:p-8">
          <div>
            <h2 className="font-sans text-2xl font-semibold tracking-normal">Gratuit</h2>
            <p className="mt-1 text-4xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">pour toujours</p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {free.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="cta" className="mt-auto">
            <Link href="/diagnostic">
              Commencer gratuitement <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Card>
        <Card className="flex flex-col gap-5 p-6 sm:p-8">
          <div>
            <h2 className="flex items-center gap-2 font-sans text-2xl font-semibold tracking-normal">
              Pro <Sparkles className="size-5 text-accent" aria-hidden />
            </h2>
            <p className="mt-1 text-4xl font-bold">Bientôt</p>
            <p className="text-sm text-muted-foreground">prix adapté à chaque pays</p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {pro.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-auto text-sm text-muted-foreground">
            L&apos;offre Pro n&apos;est pas encore ouverte. Elle sera annoncée dans l&apos;application et par email, avant
            tout changement de l&apos;offre gratuite.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
