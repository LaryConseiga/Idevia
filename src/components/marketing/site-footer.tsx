import Link from "next/link";
import { Logo } from "@/components/logo";

const columns = [
  {
    title: "Produit",
    links: [
      { href: "/comment-ca-marche", label: "Comment ça marche" },
      { href: "/tarifs", label: "Tarifs" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Aide",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/diagnostic", label: "Commencer" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/legal/conditions", label: "Conditions d'utilisation" },
      { href: "/legal/confidentialite", label: "Confidentialité" },
      { href: "/legal/mentions-legales", label: "Mentions légales" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            De ton idée à ton premier projet concret. Idevia t&apos;aide à réfléchir et à planifier : il ne garantit
            pas de revenus et ne remplace pas un conseil juridique, fiscal ou financier.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="font-sans text-sm font-semibold tracking-normal">{col.title}</h2>
            <ul className="mt-3 space-y-1">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
