import type { MetadataRoute } from "next";
import { listPublishedPosts } from "@/server/dal/posts";

/** Pages publiques indexables. Les articles du blog s'ajouteront ici. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const pages = [
    "",
    "/tarifs",
    "/blog",
    "/legal/conditions",
    "/legal/confidentialite",
    "/legal/mentions-legales",
  ];
  const posts = await listPublishedPosts();
  const articles = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.revisedAt ?? post.publishedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [
    ...pages.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: (path === "" ? "weekly" : "monthly") as
        "weekly" | "monthly",
      priority: path === "" ? 1 : path.startsWith("/legal") ? 0.3 : 0.7,
    })),
    ...articles,
  ];
}
