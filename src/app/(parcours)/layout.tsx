import { UserRound } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Logo } from "@/components/logo";
import { requireUser } from "@/server/dal/session";

// Étape du choix de l'idée, en plein écran comme le diagnostic : pas encore de tableau de bord.
export const instant = false;

export default async function ChoiceLayout({ children }: LayoutProps<"/">) {
  await connection();
  await requireUser("/idees");
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--primary-soft),transparent)]">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo href="/idees" />
        <Link
          href="/compte"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <UserRound className="size-4" aria-hidden /> Mon compte
        </Link>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-2 pb-16 sm:px-6 sm:pt-6">
        {children}
      </main>
    </div>
  );
}
