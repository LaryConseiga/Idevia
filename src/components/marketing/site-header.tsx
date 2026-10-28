import { ArrowUpRight, Menu } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

/** Sections de la page d'accueil (ancres) ; seule « Tarifs » est une page à part. */
export const NAV = [
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/#idees", label: "Les idées" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/#faq", label: "FAQ" },
];

/** Barre flottante en pilule, rendue côté serveur : le menu mobile utilise <details>, sans JavaScript. */
export function SiteHeader() {
  return (
    <header className="sticky top-3 z-40 px-3 sm:top-4">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 rounded-full border border-border bg-card/80 pr-2 pl-5 shadow-card backdrop-blur-md">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-1 md:flex">
          <Link href="/connexion" className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Connexion
          </Link>
          <Link
            href="/diagnostic"
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Commencer <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>

        <details className="group relative md:hidden">
          <summary
            className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full hover:bg-muted [&::-webkit-details-marker]:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" aria-hidden />
          </summary>
          <div className="absolute right-0 mt-3 w-[min(18rem,calc(100vw-1.5rem))] rounded-3xl border border-border bg-card p-2 shadow-card">
            <nav aria-label="Navigation mobile" className="flex flex-col">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-2xl px-4 py-3 font-medium hover:bg-muted">
                  {item.label}
                </Link>
              ))}
              <Link href="/connexion" className="rounded-2xl px-4 py-3 font-medium hover:bg-muted">
                Connexion
              </Link>
            </nav>
            <Link
              href="/diagnostic"
              className="mt-2 flex min-h-12 items-center justify-center gap-1 rounded-full bg-foreground font-semibold text-background"
            >
              Commencer <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
