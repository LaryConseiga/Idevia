import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Hors ligne", robots: { index: false } };

/** Page statique mise en cache par le service worker : affichée quand le réseau est indisponible. */
export default function OfflinePage() {
  return (
    <main id="contenu" className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="size-12" />
      <WifiOff className="mt-8 size-10 text-muted-foreground" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">Pas de connexion pour le moment</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Ton projet est bien sauvegardé. Dès que le réseau revient, recharge la page pour reprendre où tu en étais.
      </p>
    </main>
  );
}
