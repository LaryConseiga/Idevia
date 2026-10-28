import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IdeaDetail } from "@/components/ideas/idea-detail";
import { requireUser } from "@/server/dal/session";
import { getIdeaDetail, getSelectedIdea } from "@/server/ideas/service";

export const metadata: Metadata = { title: "Mon idée" };

/** L'idée validée, et seulement elle : les autres propositions restent dans l'étape de choix. */
export default async function MyIdeaPage() {
  const user = await requireUser("/mon-idee");
  const selected = await getSelectedIdea(user.id);
  if (!selected) redirect("/idees");
  const idea = await getIdeaDetail(user.id, selected.id);
  if (!idea || idea === "locked") redirect("/idees");
  return (
    <IdeaDetail
      idea={idea}
      back={<p className="text-sm font-semibold tracking-wide text-primary uppercase">Mon idée</p>}
      footer={
        <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="font-medium">Elle ne te convient plus tout à fait ? Tu peux la repenser depuis ton plan.</p>
          <Link
            href="/tableau-de-bord#repenser"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Mon plan d&apos;action <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      }
    />
  );
}
