import type { MetadataRoute } from "next";

/** Pages publiques indexables. Les articles du blog s'ajouteront ici. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const pages = [
    "",
    "/comment-ca-marche",
    "/tarifs",
    "/faq",
    "/contact",
    "/legal/conditions",
    "/legal/confidentialite",
    "/legal/mentions-legales",
  ];
  return pages.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/legal") ? 0.3 : 0.7,
  }));
}
