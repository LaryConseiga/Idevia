import Link from "next/link";
import { Logo } from "@/components/logo";

const links = [
  { href: "/tarifs", label: "Tarifs" },
  { href: "/blog", label: "Blog" },
  { href: "/#contact", label: "Contact" },
  { href: "/legal/conditions", label: "Conditions" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/mentions-legales", label: "Mentions légales" },
  { href: "/legal/mentions-legales#credits-photos", label: "Crédits photos" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:grid-cols-[1fr_2fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-xs leading-relaxed">
            Idevia t&apos;aide à réfléchir et à planifier : il ne garantit pas de revenus et ne remplace pas un conseil juridique,
            fiscal ou financier.
          </p>
        </div>
        <nav aria-label="Liens du site" className="flex flex-wrap content-start gap-x-6 gap-y-1 md:justify-end">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-10 items-center hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
