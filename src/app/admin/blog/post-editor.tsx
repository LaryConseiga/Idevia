"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { Markdown } from "@/lib/markdown";
import type { AdminPost } from "@/server/dal/posts";
import { deletePostAction, savePostAction, type PostFormState } from "./actions";

/** « Créer mon business au Sénégal » → « creer-mon-business-au-senegal » */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

const field = "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-base";

export function PostEditor({ post }: { post: AdminPost | null }) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(savePostAction, { error: null });
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [content, setContent] = useState(post?.content ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? "");
  const [preview, setPreview] = useState(false);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Titre
          <input
            name="title"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Adresse de l&apos;article
          <span className="flex items-center gap-1 text-muted-foreground">
            /blog/
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className={field}
            />
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Chapeau (affiché dans la liste des articles)
          <textarea name="excerpt" rows={2} defaultValue={post?.excerpt ?? ""} maxLength={300} className={`${field} py-2`} />
        </label>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Contenu</span>
            <button type="button" onClick={() => setPreview((v) => !v)} className="min-h-9 cursor-pointer text-sm font-medium text-primary">
              {preview ? "Modifier" : "Aperçu"}
            </button>
          </div>
          <textarea
            name="content"
            required
            rows={22}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            hidden={preview}
            className={`${field} py-3 font-mono text-sm leading-relaxed`}
          />
          {preview && (
            <Card className="article flex flex-col gap-4 p-6 leading-relaxed">
              <Markdown source={content} />
            </Card>
          )}
          <p className="text-xs text-muted-foreground">
            ## Titre, ### Sous-titre, - liste, 1. liste numérotée, &gt; citation, **gras**, *italique*, [lien](https://…). Pas de HTML.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            État
            <select name="status" defaultValue={post?.status === "published" ? "published" : "draft"} className={field}>
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </label>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.savedAt && !state.error && <Alert tone="success">Enregistré.</Alert>}
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {post?.status === "published" && (
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="text-center text-sm font-medium text-primary hover:underline">
              Voir l&apos;article en ligne
            </a>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <p className="font-semibold">Référencement</p>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Catégorie
            <input name="category" defaultValue={post?.category ?? ""} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Titre pour Google (60 caractères conseillés)
            <input name="seoTitle" defaultValue={post?.seoTitle ?? ""} maxLength={70} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Description pour Google ({seoDescription.length}/160)
            <textarea
              name="seoDescription"
              rows={3}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              maxLength={170}
              className={`${field} py-2`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Image de couverture (chemin, ex. /blog/image.webp)
            <input name="coverImage" defaultValue={post?.coverImage ?? ""} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Description de l&apos;image (accessibilité)
            <input name="coverAlt" defaultValue={post?.coverAlt ?? ""} className={field} />
          </label>
        </Card>

        {post && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (window.confirm("Supprimer définitivement cet article ?")) void deletePostAction(post.id);
            }}
          >
            Supprimer l&apos;article
          </Button>
        )}
      </div>
    </form>
  );
}
