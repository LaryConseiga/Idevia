import {
  ArrowUpRight,
  Bell,
  Compass,
  Hammer,
  Laptop,
  Lightbulb,
  ListChecks,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Search,
  ShoppingBasket,
  Sprout,
  Store,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { FAQS, FaqList } from "@/components/marketing/faq";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { HomeBackground } from "@/components/marketing/home-background";
import { JsonLd } from "@/components/marketing/json-ld";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const base = process.env.APP_URL ?? "http://localhost:3000";

const NATURES = [
  { icon: Wrench, label: "Service sur place", text: "Réparation, coiffure, ménage, livraison…", tone: "border-sky/50" },
  { icon: Hammer, label: "Fabrication", text: "Couture, savons, meubles, artisanat…", tone: "border-accent/50" },
  { icon: Sprout, label: "Agriculture et élevage", text: "Maraîchage, volaille, transformation…", tone: "border-success/50" },
  { icon: UtensilsCrossed, label: "Restauration", text: "Plats du midi, traiteur, jus, pâtisserie…", tone: "border-highlight/50" },
  { icon: ShoppingBasket, label: "Commerce", text: "Boutique, revente, import, distribution…", tone: "border-destructive/50" },
  { icon: Laptop, label: "Numérique", text: "Formation, graphisme, vente en ligne…", tone: "border-violet/50" },
];

/** Page d'accueil unique : chaque entrée du menu fait défiler jusqu'à sa section (#ancre). */
export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: "Idevia", url: base, logo: `${base}/icons/icon-512.png` },
            {
              "@type": "SoftwareApplication",
              name: "Idevia",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Android, iOS",
              inLanguage: "fr",
              url: base,
              offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ],
        }}
      />

      {/* Accroche */}
      <section className="relative isolate overflow-hidden px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
        <HomeBackground />
        <h1 className="mx-auto max-w-4xl text-5xl leading-[1.02] font-semibold tracking-[-0.05em] sm:text-7xl lg:text-[5.5rem]">
          Trouve{" "}
          <Tile tone="bg-accent text-accent-foreground">
            <Lightbulb className="size-[0.55em]" aria-hidden />
          </Tile>{" "}
          ton idée
          <br />
          et lance-toi{" "}
          <Tile tone="bg-primary text-primary-foreground">
            <Sprout className="size-[0.55em]" aria-hidden />
          </Tile>
          <br />
          <span className="text-muted-foreground">pour de vrai.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Idevia apprend à te connaître, te propose 3 idées de business variées faites pour toi, les vérifie sur le terrain et
          t&apos;accompagne jusqu&apos;à ton premier client.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/diagnostic"
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full bg-foreground px-6 font-semibold text-background transition-opacity hover:opacity-90"
          >
            Trouver mon idée <ArrowUpRight className="size-5" aria-hidden />
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-success" aria-hidden /> Gratuit · sans carte bancaire · 10 minutes
          </span>
        </div>
        <div className="mt-14">
          <HeroDemo />
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment-ca-marche" className="px-4 py-20 sm:px-6">
        <h2 className="mx-auto max-w-5xl text-center text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          Une idée qui change ta vie.
          <br />
          <span className="text-muted-foreground">Comment la trouver ?</span>
        </h2>

        <Step n={1} title="Fais connaissance" subtitle="Un échange, pas un formulaire">
          Une question à la fois, choisie selon ta réponse : ce que tu sais faire, ce qui t&apos;attire, ton budget, ton temps.
          À la fin, Idevia te dit ce qu&apos;il a compris de toi, et tu corriges si besoin.
        </Step>

        <div id="idees" className="scroll-mt-24">
          <Step n={2} title="Reçois 3 idées variées" subtitle="Pas seulement du commerce en ligne">
            Plusieurs modèles d&apos;IA imaginent une douzaine d&apos;idées, un autre les note sur six critères, et les trois
            meilleures, de natures différentes, sont rédigées avec leur plan de 30 jours.
          </Step>
          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-3">
            {NATURES.map((n) => (
              <div key={n.label} className={cn("flex flex-col items-center gap-2 rounded-2xl border bg-card px-4 py-7 text-center", n.tone)}>
                <n.icon className="size-8" aria-hidden />
                <p className="font-semibold">{n.label}</p>
                <p className="text-sm text-muted-foreground">{n.text}</p>
              </div>
            ))}
          </div>
        </div>

        <Step n={3} title="Vérifie-la sur le terrain" subtitle="De vraies données, avant de dépenser">
          Idevia regarde qui vend déjà près de toi, ce que les gens cherchent et qui fait de la publicité. Chaque constat est
          sourcé et daté.
        </Step>
        <Cards
          items={[
            { icon: Store, label: "Concurrents proches", tone: "border-success/50" },
            { icon: Search, label: "Ce que les gens cherchent", tone: "border-sky/50" },
            { icon: Megaphone, label: "Publicités en cours", tone: "border-highlight/50" },
          ]}
        />
        <div className="mx-auto mt-6 grid max-w-4xl gap-6 border-t border-border pt-6 text-left md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Avant</p>
            <p className="mt-2 text-lg">« Je veux vendre des vêtements. »</p>
          </div>
          <div className="md:border-l md:border-border md:pl-6">
            <p className="text-xs font-semibold text-primary uppercase">Après</p>
            <p className="mt-2 text-lg">
              Kits mère-enfant en wax pour les baptêmes à Abidjan, 30 000 FCFA avec 50 % d&apos;acompte, vendus sur WhatsApp, là
              où aucun concurrent ne fait de publicité.
            </p>
          </div>
        </div>

        <Step n={4} title="Avance avec ton coach" subtitle="Ton idée évolue avec toi">
          Ton plan devient une liste d&apos;actions datées. Le coach connaît ton projet, t&apos;aide quand tu bloques, et ton idée
          peut être repensée selon ce que tu découvres.
        </Step>
        <Cards
          items={[
            { icon: ListChecks, label: "Plan de 30 jours", tone: "border-primary/50" },
            { icon: MessageCircle, label: "Coach qui se souvient", tone: "border-violet/50" },
            { icon: Bell, label: "Rappels au bon moment", tone: "border-accent/50" },
          ]}
        />
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 py-20 sm:px-6">
        <h2 className="text-center text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Des questions ? Des réponses.</h2>
        <div className="mx-auto mt-10 max-w-2xl">
          <FaqList items={FAQS} />
        </div>
      </section>

      {/* Contact et fin */}
      <section id="contact" className="px-4 pt-16 pb-20 text-center sm:px-6">
        <p className="font-display text-4xl leading-tight font-semibold tracking-[-0.05em] sm:text-7xl">
          Pensé pour les futurs entrepreneurs.
          <br />
          <span className="text-muted-foreground">Construit pour ton premier client.</span>
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/diagnostic"
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full bg-foreground px-6 font-semibold text-background hover:opacity-90"
          >
            Commencer <ArrowUpRight className="size-5" aria-hidden />
          </Link>
          {SITE.contactEmail && (
            <a
              href={`mailto:${SITE.contactEmail}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border px-6 font-medium hover:bg-card"
            >
              <Mail className="size-4" aria-hidden /> {SITE.contactEmail}
            </a>
          )}
        </div>
        <p className="mt-6 inline-flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Compass className="size-4" aria-hidden /> Afrique, Europe, Canada, océan Indien
          <MapPin className="ml-2 size-4" aria-hidden /> ou en ligne
        </p>
      </section>
    </>
  );
}

function Tile({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-[0.9em] -translate-y-[0.08em] rotate-[-6deg] items-center justify-center rounded-[0.22em] align-middle shadow-card",
        tone,
      )}
    >
      {children}
    </span>
  );
}

function Step({ n, title, subtitle, children }: { n: number; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto mt-20 max-w-3xl text-center">
      <h3 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
        {n}. {title}
      </h3>
      <p className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl">{subtitle}</p>
      <p className="mt-3 leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function Cards({ items }: { items: { icon: typeof Store; label: string; tone: string }[] }) {
  return (
    <div className="mx-auto mt-8 grid max-w-5xl gap-3 md:grid-cols-3">
      {items.map((c) => (
        <div key={c.label} className={cn("flex items-center justify-center gap-3 rounded-2xl border bg-card px-4 py-8", c.tone)}>
          <c.icon className="size-7" aria-hidden />
          <span className="font-semibold">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
