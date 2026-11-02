import { Menu } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/** Sections de la page d'accueil (ancres) ; seule « Tarifs » est une page à part. */
export const NAV = [
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/#idees", label: "Les idées" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/#faq", label: "Questions" },
];

/** Barre du site public, rendue côté serveur : le menu mobile utilise <details>, sans JavaScript. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link href="/connexion" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Connexion
          </Link>
          <Link
            href="/diagnostic"
            className="inline-flex min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Commencer
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <details className="group relative">
            <summary
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full hover:bg-muted [&::-webkit-details-marker]:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="size-5" aria-hidden />
            </summary>
            <div className="absolute right-0 mt-3 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-2 shadow-card">
              <nav aria-label="Navigation mobile" className="flex flex-col">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-xl px-4 py-3 font-medium hover:bg-muted">
                    {item.label}
                  </Link>
                ))}
                <Link href="/connexion" className="rounded-xl px-4 py-3 font-medium hover:bg-muted">
                  Connexion
                </Link>
              </nav>
              <Link
                href="/diagnostic"
                className="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-accent font-semibold text-accent-foreground"
              >
                Commencer
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
