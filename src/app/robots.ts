import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/tableau-de-bord",
        "/idees",
        "/projet",
        "/assistant",
        "/compte",
        "/diagnostic",
        "/connexion",
        "/inscription",
        "/mot-de-passe",
        "/hors-ligne",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
