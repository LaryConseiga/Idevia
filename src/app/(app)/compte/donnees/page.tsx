import { ArrowLeft, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/server/dal/session";

export const metadata: Metadata = { title: "Mes données" };

export default async function DataPage() {
  await requireUser("/compte/donnees");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/compte" className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Mon compte
      </Link>
      <h1 className="text-3xl font-bold">Mes données</h1>
      <Card className="flex flex-col items-start gap-4 p-6 sm:p-8">
        <p className="leading-relaxed">
          Télécharge tout ce qu&apos;Idevia sait de toi, en clair : ton compte, tes réponses au diagnostic, ton portrait, tes
          idées, ton projet et son plan, tes vérifications terrain, tes hypothèses, tes échanges avec le coach et ce
          qu&apos;il retient de ton projet.
        </p>
        <p className="text-sm text-muted-foreground">
          Le fichier est au format JSON, lisible par d&apos;autres services. Garde-le en lieu sûr : il contient des
          informations personnelles.
        </p>
        {/* Lien direct : le navigateur télécharge le fichier, aucun script nécessaire. */}
        <a
          href="/api/compte/export"
          download
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          <Download className="size-5" aria-hidden /> Télécharger mes données
        </a>
      </Card>
    </div>
  );
}
