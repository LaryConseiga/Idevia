import type { Metadata, Viewport } from "next";
import { Figtree, Inter } from "next/font/google";
import { Pwa } from "@/components/pwa";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap", weight: ["500", "600", "700"] });

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
  icons: { apple: "/icons/apple-touch-icon.png" },
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
    <html lang="fr" className={`${inter.variable} ${figtree.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
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
