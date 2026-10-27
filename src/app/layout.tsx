import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { Pwa } from "@/components/pwa";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["600", "700", "800"],
});

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFBF5" },
    { media: "(prefers-color-scheme: dark)", color: "#12110F" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${bricolage.variable} antialiased`}>
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
