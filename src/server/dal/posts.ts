import "server-only";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db/client";
import { posts } from "@/server/db/schema";
import { withSystem } from "./context";

/**
 * Blog. Lecture publique : la RLS ne laisse voir que les articles publiés (politique public_read),
 * sans contexte utilisateur. Écriture : contexte système, depuis l'administration uniquement.
 */

export const POSTS_TAG = "posts";

export type PublicPost = {
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  excerpt: string | null;
  content: string;
  category: string | null;
  coverImage: string | null;
  coverAlt: string | null;
  publishedAt: Date;
  revisedAt: Date | null;
};

const publicColumns = {
  slug: posts.slug,
  title: posts.title,
  seoTitle: posts.seoTitle,
  seoDescription: posts.seoDescription,
  excerpt: posts.excerpt,
  content: posts.content,
  category: posts.category,
  coverImage: posts.coverImage,
  coverAlt: posts.coverAlt,
  publishedAt: posts.publishedAt,
  revisedAt: posts.revisedAt,
};

const published = and(eq(posts.status, "published"), lte(posts.publishedAt, sql`now()`));

export async function listPublishedPosts(): Promise<PublicPost[]> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("hours");
  const rows = await db.select(publicColumns).from(posts).where(published).orderBy(desc(posts.publishedAt)).limit(100);
  return rows as PublicPost[];
}

export async function getPublishedPost(slug: string): Promise<PublicPost | null> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("hours");
  const [row] = await db.select(publicColumns).from(posts).where(and(published, eq(posts.slug, slug))).limit(1);
  return (row as PublicPost | undefined) ?? null;
}

// ---------------------------------------------------------------- Administration

export type AdminPost = typeof posts.$inferSelect;

export function adminListPosts() {
  return withSystem("admin:posts:list", (tx) =>
    tx
      .select({ id: posts.id, slug: posts.slug, title: posts.title, status: posts.status, publishedAt: posts.publishedAt, updatedAt: posts.updatedAt })
      .from(posts)
      .orderBy(desc(posts.updatedAt)),
  );
}

export function adminGetPost(id: string): Promise<AdminPost | null> {
  return withSystem("admin:posts:get", async (tx) => {
    const [row] = await tx.select().from(posts).where(eq(posts.id, id));
    return row ?? null;
  });
}

export type PostInput = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  coverImage: string | null;
  coverAlt: string | null;
  status: "draft" | "published";
};

export class SlugTakenError extends Error {}

/** Crée ou met à jour un article ; la date de publication est fixée à la première mise en ligne. */
export function savePost(id: string | null, input: PostInput, authorId: string): Promise<string> {
  return withSystem("admin:posts:save", async (tx) => {
    const [clash] = await tx.select({ id: posts.id }).from(posts).where(eq(posts.slug, input.slug));
    if (clash && clash.id !== id) throw new SlugTakenError();
    if (!id) {
      const [row] = await tx
        .insert(posts)
        .values({ ...input, authorId, publishedAt: input.status === "published" ? sql`now()` : null })
        .returning({ id: posts.id });
      return row.id;
    }
    const [current] = await tx.select({ publishedAt: posts.publishedAt }).from(posts).where(eq(posts.id, id));
    await tx
      .update(posts)
      .set({
        ...input,
        publishedAt: input.status === "published" ? (current?.publishedAt ?? sql`now()`) : current?.publishedAt,
        revisedAt: current?.publishedAt && input.status === "published" ? sql`now()` : null,
      })
      .where(eq(posts.id, id));
    return id;
  });
}

export function deletePost(id: string) {
  return withSystem("admin:posts:delete", (tx) => tx.delete(posts).where(eq(posts.id, id)));
}
