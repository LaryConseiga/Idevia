import { Menu } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
];

/** Entièrement rendu côté serveur : le menu mobile utilise <details>, sans JavaScript. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/connexion">Connexion</Link>
          </Button>
          <Button asChild variant="cta" size="sm">
            <Link href="/diagnostic">Trouver mon idée</Link>
          </Button>
        </div>

        <details className="group relative md:hidden">
          <summary
            className="flex size-11 cursor-pointer list-none items-center justify-center rounded-xl hover:bg-muted [&::-webkit-details-marker]:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-6" aria-hidden />
          </summary>
          <div className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-card border border-border bg-card p-2 shadow-card">
            <nav aria-label="Navigation mobile" className="flex flex-col">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg px-3 py-3 font-medium hover:bg-muted">
                  {item.label}
                </Link>
              ))}
              <Link href="/connexion" className="rounded-lg px-3 py-3 font-medium hover:bg-muted">
                Connexion
              </Link>
            </nav>
            <Button asChild variant="cta" className="mt-2 w-full">
              <Link href="/diagnostic">Trouver mon idée</Link>
            </Button>
          </div>
        </details>
      </div>
    </header>
  );
}
