"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/server/dal/admin";
import { deletePost, POSTS_TAG, savePost, SlugTakenError } from "@/server/dal/posts";
import { requireAdmin } from "@/server/dal/session";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null);

const schema = z.object({
  id: z.uuid().nullable(),
  title: z.string().trim().min(3, "Le titre est trop court.").max(140),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "L'adresse ne doit contenir que des lettres sans accent, des chiffres et des tirets.")
    .max(100),
  excerpt: optional(300),
  content: z.string().trim().min(20, "L'article est trop court.").max(60_000),
  category: optional(60),
  seoTitle: optional(70),
  seoDescription: optional(170),
  // La CSP n'autorise que les images du site : l'image doit être déposée dans public/ (ex. /blog/mon-image.webp).
  coverImage: optional(300).refine((v) => !v || /^\/[a-z0-9/_.-]+\.(webp|avif|jpe?g|png)$/i.test(v), "L'image doit être un chemin du site, par exemple /blog/mon-image.webp."),
  coverAlt: optional(200),
  status: z.enum(["draft", "published"]),
});

export type PostFormState = { error: string | null; savedAt?: number };

export async function savePostAction(_: PostFormState, form: FormData): Promise<PostFormState> {
  const admin = await requireAdmin(["content"]);
  const raw = Object.fromEntries(["title", "slug", "excerpt", "content", "category", "seoTitle", "seoDescription", "coverImage", "coverAlt", "status"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = schema.safeParse({ ...raw, id: (form.get("id") as string) || null });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...input } = parsed.data;
  let savedId: string;
  try {
    savedId = await savePost(id, input, admin.id);
  } catch (error) {
    if (error instanceof SlugTakenError) return { error: "Cette adresse est déjà utilisée par un autre article." };
    throw error;
  }
  await audit({
    adminUserId: admin.id,
    action: id ? (input.status === "published" ? "post.publish" : "post.update") : "post.create",
    targetType: "post",
    targetId: savedId,
  });
  // Le blog public est mis en cache : on l'invalide pour afficher tout de suite la nouvelle version.
  updateTag(POSTS_TAG);
  if (!id) redirect(`/admin/blog/${savedId}`);
  return { error: null, savedAt: Date.now() };
}

export async function deletePostAction(id: string) {
  const admin = await requireAdmin(["content"]);
  if (!z.uuid().safeParse(id).success) return;
  await deletePost(id);
  await audit({ adminUserId: admin.id, action: "post.delete", targetType: "post", targetId: id });
  updateTag(POSTS_TAG);
  redirect("/admin/blog");
}
