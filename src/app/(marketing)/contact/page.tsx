import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Todo } from "@/components/marketing/page-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Une question, un souci, une demande sur tes données : comment joindre l'équipe Idevia.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const email = SITE.contactEmail;
  return (
    <PageShell eyebrow="Contact" title="Une question ? Écris-nous" intro={<p>Nous répondons en général sous 48 heures ouvrées.</p>}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 rounded-card border border-border bg-card p-5 sm:p-6">
          <Mail className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-sans text-lg font-semibold tracking-normal">Par email</h2>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              {email ? (
                <a href={`mailto:${email}`} className="font-medium text-primary underline underline-offset-4">
                  {email}
                </a>
              ) : (
                <Todo value={null} label="adresse email de contact" />
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-4 rounded-card border border-border bg-card p-5 sm:p-6">
          <MessageCircle className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-sans text-lg font-semibold tracking-normal">Une question sur ton projet ?</h2>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Le coach, dans ton espace, connaît ton plan et répond tout de suite. Pour le reste, consulte la{" "}
              <Link href="/faq" className="font-medium text-primary underline underline-offset-4">
                FAQ
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="flex gap-4 rounded-card border border-border bg-card p-5 sm:p-6">
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-sans text-lg font-semibold tracking-normal">Tes données personnelles</h2>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Export et suppression se font en un clic depuis « Mon compte ». Tout est expliqué dans la{" "}
              <Link href="/legal/confidentialite" className="font-medium text-primary underline underline-offset-4">
                politique de confidentialité
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
