import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getDeletion } from "@/server/dal/account";
import { requireUser } from "@/server/dal/session";
import { DeletionForm } from "./deletion-form";

export const metadata: Metadata = { title: "Supprimer mon compte" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function DeletionPage() {
  const user = await requireUser("/compte/suppression");
  const pending = await getDeletion(user.id);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/compte" className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Mon compte
      </Link>
      <h1 className="text-3xl font-bold">Supprimer mon compte</h1>
      <DeletionForm scheduledFor={pending ? dateFormat.format(pending.scheduledFor) : null} />
    </div>
  );
}
