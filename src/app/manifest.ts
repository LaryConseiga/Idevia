import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Idevia — De ton idée à ton projet",
    short_name: "Idevia",
    description: "Trouve une idée de business adaptée à ton profil et avance étape par étape.",
    lang: "fr",
    dir: "ltr",
    start_url: "/tableau-de-bord?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#FFFBF5",
    theme_color: "#0B5D46",
    categories: ["business", "productivity", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mon tableau de bord", url: "/tableau-de-bord", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Assistant", url: "/assistant", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
