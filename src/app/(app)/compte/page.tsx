import { ChevronRight, Download, ShieldCheck, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/server/dal/session";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser("/compte");
  const links = [
    { href: "/compte/securite", icon: ShieldCheck, title: "Sécurité", text: "Double authentification, mot de passe" },
    { href: "/compte/donnees", icon: Download, title: "Mes données", text: "Exporter tout ce qu'Idevia sait de toi" },
    { href: "/compte/suppression", icon: Trash2, title: "Supprimer mon compte", text: "Effacement définitif après 30 jours" },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold">Mon compte</h1>
      <Card className="mt-6 p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Prénom</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd className="font-medium break-all">{user.email}</dd>
          </div>
        </dl>
      </Card>
      <ul className="mt-6 divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="flex min-h-16 items-center gap-4 px-5 py-4 hover:bg-muted">
              <link.icon className="size-5 text-primary" aria-hidden />
              <span className="flex-1">
                <span className="block font-medium">{link.title}</span>
                <span className="block text-sm text-muted-foreground">{link.text}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
