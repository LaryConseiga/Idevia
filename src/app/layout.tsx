import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import { Pwa } from "@/components/pwa";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Titres : une serif à caractère, pour une voix éditoriale plutôt que « modèle de site ».
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz", "SOFT"] });

/** Applique le thème choisi avant le premier affichage (pas de flash). Sombre par défaut. */
const THEME_SCRIPT = `try{if(localStorage.getItem("idevia-theme")==="light"){document.documentElement.dataset.theme="light";document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#F6F2EA")}}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Idevia — Trouve ton idée de business et passe à l'action",
    template: "%s · Idevia",
  },
  description:
    "Idevia t'aide à trouver une idée de business adaptée à ton profil, à la tester sur ton marché et à avancer étape par étape avec un plan concret.",
  applicationName: "Idevia",
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: "Idevia", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: { type: "website", locale: "fr_FR", siteName: "Idevia" },
};

export const viewport: Viewport = {
  themeColor: "#12110F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable} antialiased`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <Script id="theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-card"
        >
          Aller au contenu
        </a>
        {children}
        <Pwa />
      </body>
    </html>
  );
}
