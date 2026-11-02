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

/** Idées qui défilent dans la section « Les idées » : des natures et des lieux variés, lus en quelques secondes. */
const SAMPLE_IDEAS = [
  "un food truck à Lyon ?",
  "une boutique en ligne depuis Dakar ?",
  "une ferme urbaine à Casablanca ?",
  "un salon de coiffure à Montréal ?",
  "des cours en ligne pour la diaspora ?",
  "un service pour les PME d'Abidjan ?",
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
          <Figure photo={PHOTOS.projet} sizes="(min-width: 1024px) 40vw, 100vw" className="aspect-[4/5] max-lg:aspect-[4/3]" priority />
          <Figure
            photo={PHOTOS.hydroponie}
            sizes="220px"
            className="absolute -top-8 -left-6 hidden aspect-[3/4] w-40 rotate-[-3deg] border-4 border-background shadow-card xl:block"
            hideCaption
          />
        </div>
      </section>

      {/* Les idées : de toutes natures, en une phrase animée */}
      <section id="idees" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm text-muted-foreground">Des idées de toutes natures</p>
          <h2 className="mt-4 font-display text-3xl leading-tight font-medium tracking-tight sm:text-5xl lg:text-6xl">
            Et si tu lançais
            <span className="sr-only"> {SAMPLE_IDEAS.join(" Ou ")}</span>
            <span aria-hidden className="idea-ticker mt-1 block text-accent italic">
              <span className="idea-ticker-track">
                {[...SAMPLE_IDEAS, SAMPLE_IDEAS[0]].map((idea, i) => (
                  <span key={i} className="idea-ticker-item">
                    {idea}
                  </span>
                ))}
              </span>
            </span>
          </h2>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Vente en ligne, service, agriculture, restauration, formation ou fabrication : tes trois idées sont toujours de
            natures différentes, et toutes partent de ce que tu sais déjà faire.
          </p>
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
              « Je veux faire quelque chose dans la cuisine. »
            </p>
          </div>
          <div>
            <p className="text-sm text-band-muted">Après dix minutes avec Idevia</p>
            <p className="mt-3 font-display text-3xl leading-snug sm:text-4xl">
              Des plats du midi livrés aux bureaux du quartier de la Part-Dieu à Lyon, 12 € le menu, commandés la veille par
              message, le temps de tester avant d&apos;investir dans un local.
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

/** Photo avec légende et crédit (licences Creative Commons : l'auteur et la licence sont toujours cités). */
function Figure({
  photo,
  sizes,
  className,
  priority,
  hideCaption,
}: {
  photo: Photo;
  sizes: string;
  className?: string;
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
          {photo.caption}. Photo {photo.author}, {photo.license.name}.
        </figcaption>
      )}
    </figure>
  );
}
