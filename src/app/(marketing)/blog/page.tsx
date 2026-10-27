import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/marketing/page-shell";
import { plainText } from "@/lib/markdown";
import { listPublishedPosts } from "@/server/dal/posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "Conseils concrets pour trouver ton idée, tester ton marché et lancer ton activité, en Afrique, en Europe ou en ligne.",
  alternates: { canonical: "/blog" },
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function BlogPage() {
  const posts = await listPublishedPosts();
  return (
    <PageShell eyebrow="Blog" title="Conseils pour lancer ton activité" intro={<p>Des idées, des méthodes et des exemples concrets, sans jargon.</p>}>
      {posts.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-6 text-muted-foreground">Les premiers articles arrivent bientôt.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="block rounded-card border border-border bg-card p-5 transition-colors hover:border-primary/40 sm:p-6">
                <p className="text-sm text-muted-foreground">
                  {post.category && <span className="font-semibold text-primary">{post.category} · </span>}
                  {dateFormat.format(post.publishedAt)}
                </p>
                <h2 className="mt-1 font-sans text-xl font-semibold tracking-normal">{post.title}</h2>
                <p className="mt-2 line-clamp-3 leading-relaxed text-muted-foreground">{post.excerpt ?? plainText(post.content).slice(0, 220)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
