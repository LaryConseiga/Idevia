import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonLd } from "@/components/marketing/json-ld";
import { Markdown, plainText } from "@/lib/markdown";
import { getPublishedPost } from "@/server/dal/posts";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const base = process.env.APP_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Article introuvable", robots: { index: false } };
  const description = post.seoDescription ?? post.excerpt ?? plainText(post.content).slice(0, 160);
  return {
    title: post.seoTitle ?? post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seoTitle ?? post.title,
      description,
      publishedTime: post.publishedAt.toISOString(),
      ...(post.coverImage ? { images: [{ url: post.coverImage, alt: post.coverAlt ?? "" }] } : {}),
    },
  };
}

/** Le paramètre n'est connu qu'à la requête : l'article est rendu dans un Suspense (Cache Components). */
export default function ArticlePage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        ← Tous les articles
      </Link>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-card bg-muted motion-reduce:animate-none" />}>
        {params.then(({ slug }) => (
          <Article slug={slug} />
        ))}
      </Suspense>
    </div>
  );
}

async function Article({ slug }: { slug: string }) {
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  const minutes = Math.max(1, Math.round(plainText(post.content).split(" ").length / 220));
  return (
    <article className="mt-6">
      <header>
        <p className="text-sm text-muted-foreground">
          {post.category && <span className="font-semibold text-primary">{post.category} · </span>}
          {dateFormat.format(post.publishedAt)} · {minutes} min de lecture
        </p>
        <h1 className="mt-2 text-4xl leading-tight font-bold text-balance sm:text-5xl">{post.title}</h1>
        {post.excerpt && <p className="mt-4 text-xl leading-relaxed text-muted-foreground">{post.excerpt}</p>}
      </header>
      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element -- image du site, dimensions inconnues à l'avance
        <img src={post.coverImage} alt={post.coverAlt ?? ""} className="mt-8 w-full rounded-card object-cover" loading="lazy" />
      )}
      <div className="article mt-8 flex flex-col gap-4 text-lg leading-relaxed">
        <Markdown source={post.content} />
      </div>
      <div className="mt-12 rounded-card bg-accent p-6 text-accent-foreground">
        <p className="font-sans text-xl font-semibold tracking-normal">Et toi, quelle idée te correspond ?</p>
        <Link href="/diagnostic" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-background px-4 font-semibold text-foreground">
          Faire le diagnostic gratuit
        </Link>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          datePublished: post.publishedAt.toISOString(),
          ...(post.revisedAt ? { dateModified: post.revisedAt.toISOString() } : {}),
          inLanguage: "fr",
          mainEntityOfPage: `${base}/blog/${post.slug}`,
          publisher: { "@type": "Organization", name: "Idevia" },
        }}
      />
    </article>
  );
}
