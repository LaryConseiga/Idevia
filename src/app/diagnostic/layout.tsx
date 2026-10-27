import { X } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/server/dal/session";

// Rendu dynamique : CSP à nonce et réponses personnelles jamais pré-rendues.
export const instant = false;

export default async function DiagnosticLayout({ children }: LayoutProps<"/diagnostic">) {
  await connection();
  const user = await getCurrentUser();
  const exit = user ? "/tableau-de-bord" : "/";

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--primary-soft),transparent)]">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo href={exit} />
        <Link
          href={exit}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
          Quitter
          <span className="sr-only"> l&apos;entretien (tes réponses sont sauvegardées)</span>
        </Link>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-2 pb-16 sm:px-6 sm:pt-6">
        {children}
      </main>
    </div>
  );
}
