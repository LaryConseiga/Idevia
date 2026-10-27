import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminGetPost } from "@/server/dal/posts";
import { requireAdmin } from "@/server/dal/session";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "Article" };

/** « nouveau » ouvre un article vide ; sinon l'identifiant de l'article à modifier. */
export default async function AdminPostPage({ params }: PageProps<"/admin/blog/[id]">) {
  await requireAdmin(["content"]);
  const { id } = await params;
  const post = id === "nouveau" ? null : /^[0-9a-f-]{36}$/i.test(id) ? await adminGetPost(id) : null;
  if (id !== "nouveau" && !post) notFound();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        ← Tous les articles
      </Link>
      <h1 className="text-3xl font-bold">{post ? "Modifier l'article" : "Nouvel article"}</h1>
      <PostEditor post={post} />
    </div>
  );
}
