import type { MetadataRoute } from "next";

/** Pages publiques indexables. Les articles du blog s'ajouteront ici (phase SEO). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const pages = ["", "/comment-ca-marche", "/fonctionnalites", "/tarifs", "/faq", "/blog", "/contact"];
  return pages.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
