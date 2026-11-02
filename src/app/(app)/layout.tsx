import { connection } from "next/server";
import { AppNav } from "@/components/app/app-nav";
import { Logo } from "@/components/logo";
import { requireUser } from "@/server/dal/session";
import { SignOutButton } from "@/components/app/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

// Espace privé : rendu dynamique (CSP à nonce, données personnelles jamais pré-rendues).
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection();
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-5 md:flex">
        <Logo href="/tableau-de-bord" />
        <AppNav variant="sidebar" />
        <div className="mt-auto border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2 pl-3">
            <p className="truncate text-sm font-medium" title={user.name}>
              {user.name}
            </p>
            <ThemeToggle />
          </div>
          <SignOutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <Logo href="/tableau-de-bord" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SignOutButton compact />
        </div>
      </header>

      <main id="contenu" className="flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-12 lg:px-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      <AppNav variant="bottom" />
    </div>
  );
}
