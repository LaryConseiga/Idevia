import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { adminListPosts } from "@/server/dal/posts";
import { requireAdmin } from "@/server/dal/session";

export const metadata: Metadata = { title: "Blog" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminBlogPage() {
  await requireAdmin(["content"]);
  const rows = await adminListPosts();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Blog</h1>
        <Link
          href="/admin/blog/nouveau"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="size-4" aria-hidden /> Nouvel article
        </Link>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
        {rows.length === 0 && <li className="px-5 py-8 text-center text-muted-foreground">Aucun article pour l&apos;instant.</li>}
        {rows.map((post) => (
          <li key={post.id}>
            <Link href={`/admin/blog/${post.id}`} className="flex min-h-16 items-center gap-4 px-5 py-3 hover:bg-muted">
              <span className="flex-1">
                <span className="block font-medium">{post.title}</span>
                <span className="block text-sm text-muted-foreground">/blog/{post.slug}</span>
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  post.status === "published" ? "bg-success-soft text-success" : "bg-muted",
                )}
              >
                {post.status === "published" ? `Publié le ${post.publishedAt ? dateFormat.format(post.publishedAt) : "?"}` : "Brouillon"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
