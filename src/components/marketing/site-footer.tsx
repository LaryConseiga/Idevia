import Link from "next/link";

const links = [
  { href: "/tarifs", label: "Tarifs" },
  { href: "/blog", label: "Blog" },
  { href: "/#contact", label: "Contact" },
  { href: "/legal/conditions", label: "Conditions" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/mentions-legales", label: "Mentions légales" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <nav aria-label="Liens du site" className="flex flex-wrap justify-center gap-x-1 gap-y-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-10 items-center rounded-full px-3 hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="max-w-xl text-center text-xs leading-relaxed">
          Idevia t&apos;aide à réfléchir et à planifier : il ne garantit pas de revenus et ne remplace pas un conseil juridique,
          fiscal ou financier.
        </p>
        <p className="text-xs">© Idevia</p>
      </div>
    </footer>
  );
}
