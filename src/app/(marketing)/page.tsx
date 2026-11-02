import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FAQS, FaqList } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { CoachSnippet, DiagnosticSnippet, FieldSnippet, IdeasSnippet } from "@/components/marketing/product-snippets";
import { PHOTOS, type Photo } from "@/lib/photos";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const base = process.env.APP_URL ?? "http://localhost:3000";

const KINDS: { photo: Photo; kind: string }[] = [
  { photo: PHOTOS.beignets, kind: "Restauration" },
  { photo: PHOTOS.maroquinerie, kind: "Fabrication" },
  { photo: PHOTOS.reparation, kind: "Service" },
  { photo: PHOTOS.marche, kind: "Commerce" },
];

const STEPS = [
  {
    title: "Fais connaissance",
    text: "Une question à la fois, choisie selon ta réponse : ce que tu sais faire, ce qui t'attire, ton budget, ton temps. À la fin, Idevia te dit ce qu'il a compris de toi, et tu corriges si besoin.",
    snippet: <DiagnosticSnippet />,
  },
  {
    title: "Reçois 3 idées qui ne se ressemblent pas",
    text: "Plusieurs modèles d'IA imaginent une douzaine d'idées, un autre les note sur six critères, et les trois meilleures, de natures différentes, sont rédigées avec leur plan de 30 jours.",
    snippet: <IdeasSnippet />,
  },
  {
    title: "Vérifie-la sur le terrain",
    text: "Avant de dépenser, Idevia regarde qui vend déjà près de toi, ce que les gens cherchent et qui fait de la publicité. Chaque constat est sourcé et daté.",
    snippet: <FieldSnippet />,
  },
  {
    title: "Avance avec ton coach",
    text: "Ton plan devient une liste d'actions datées. Le coach connaît ton projet, t'aide quand tu bloques, et ton idée peut être repensée selon ce que tu découvres.",
    snippet: <CoachSnippet />,
  },
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
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20">
        <div>
          <p className="text-sm text-muted-foreground">Pour les futurs entrepreneurs francophones</p>
          <h1 className="mt-4 text-5xl leading-[1.03] font-medium tracking-tight sm:text-6xl lg:text-7xl">
            Trouve l&apos;idée qui te ressemble.{" "}
            <em className="text-accent">
              <span className="whitespace-nowrap">Lance-toi</span> pour de vrai.
            </em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Idevia apprend à te connaître, te propose trois idées de business faites pour toi, les vérifie sur le terrain et
            t&apos;accompagne jusqu&apos;à ton premier client.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <PrimaryLink href="/diagnostic">Trouver mon idée</PrimaryLink>
            <Link href="#comment-ca-marche" className="font-medium underline decoration-border underline-offset-8 hover:decoration-foreground">
              Voir comment ça marche
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Gratuit, sans carte bancaire. Environ 10 minutes.</p>
        </div>

        <div className="relative lg:pl-6">
          <Figure photo={PHOTOS.recolte} sizes="(min-width: 1024px) 40vw, 100vw" className="aspect-[4/5] max-lg:aspect-[4/3]" priority />
          <Figure
            photo={PHOTOS.maroquinerie}
            sizes="220px"
            className="absolute -top-8 -left-6 hidden aspect-[4/3] w-52 rotate-[-3deg] border-4 border-background shadow-card xl:block"
            hideCaption
          />
        </div>
      </section>

      {/* Les idées : de toutes natures */}
      <section id="idees" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <h2 className="text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
              Pas seulement du commerce en ligne.
            </h2>
            <p className="max-w-lg leading-relaxed text-muted-foreground">
              Un étal de beignets, un atelier de maroquinerie, un coin de réparation, une boutique de quartier, un jardin
              maraîcher ou une formation en ligne : tes trois idées sont de natures différentes, et toutes partent de ce que
              tu sais déjà faire.
            </p>
          </div>
          <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {KINDS.map(({ photo, kind }, i) => (
              <li key={kind} className={cn(i % 2 === 1 && "lg:mt-12")}>
                <Figure photo={photo} sizes="(min-width: 1024px) 25vw, 50vw" className="aspect-[3/4]" label={kind} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment-ca-marche" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
            De « je ne sais pas quoi faire » à ton premier client.
          </h2>
          <ol className="mt-14">
            {STEPS.map((step, i) => (
              <li key={step.title} className="grid gap-6 border-t border-border py-10 md:grid-cols-[5rem_1fr_1fr] md:gap-10">
                <span aria-hidden className="font-display text-5xl leading-none text-accent">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-2xl leading-snug font-medium sm:text-3xl">
                    <span className="sr-only">Étape {i + 1} : </span>
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
                <div>{step.snippet}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Avant / après, sur papier */}
      <section className="bg-band text-band-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-sm text-band-muted">Avant</p>
            <p className="mt-3 font-display text-3xl leading-snug text-band-muted line-through decoration-1 sm:text-4xl">
              « Je veux vendre des vêtements. »
            </p>
          </div>
          <div>
            <p className="text-sm text-band-muted">Après dix minutes avec Idevia</p>
            <p className="mt-3 font-display text-3xl leading-snug sm:text-4xl">
              Des kits mère-enfant en wax pour les baptêmes à Abidjan, à 30 000 FCFA avec 50 % d&apos;acompte, vendus sur
              WhatsApp, là où aucun concurrent ne fait de publicité.
            </p>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section id="faq" className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr]">
        <div>
          <h2 className="text-4xl leading-tight font-medium tracking-tight">Questions fréquentes</h2>
          {SITE.contactEmail && (
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Une autre question ? Écris-nous à{" "}
              <a href={`mailto:${SITE.contactEmail}`} className="font-medium text-foreground underline underline-offset-4">
                {SITE.contactEmail}
              </a>
              .
            </p>
          )}
        </div>
        <FaqList items={FAQS} />
      </section>

      {/* Fin */}
      <section id="contact" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="max-w-4xl font-display text-4xl leading-tight font-medium tracking-tight sm:text-6xl">
            Pensé pour les futurs entrepreneurs. <em className="text-muted-foreground">Construit pour ton premier client.</em>
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <PrimaryLink href="/diagnostic">Commencer gratuitement</PrimaryLink>
            {SITE.contactEmail && (
              <a href={`mailto:${SITE.contactEmail}`} className="font-medium underline decoration-border underline-offset-8 hover:decoration-foreground">
                {SITE.contactEmail}
              </a>
            )}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Afrique, Europe, Canada, océan Indien, ou en ligne.</p>
        </div>
      </section>
    </>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center rounded-lg bg-accent px-6 font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
    >
      {children}
    </Link>
  );
}

/** Photo avec légende et crédit (licence CC BY-SA : l'auteur est toujours cité). */
function Figure({
  photo,
  sizes,
  className,
  label,
  priority,
  hideCaption,
}: {
  photo: Photo;
  sizes: string;
  className?: string;
  label?: string;
  priority?: boolean;
  hideCaption?: boolean;
}) {
  return (
    <figure className={cn(hideCaption && className)}>
      <div className={cn("relative overflow-hidden rounded-xl bg-muted", !hideCaption && className, hideCaption && "size-full")}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          placeholder="blur"
          priority={priority}
          className="object-cover"
          style={{ objectPosition: photo.focus }}
        />
      </div>
      {!hideCaption && (
        <figcaption className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {label && <span className="block text-sm font-medium text-foreground">{label}</span>}
          {photo.caption}. Photo {photo.author}, CC BY-SA.
        </figcaption>
      )}
    </figure>
  );
}
