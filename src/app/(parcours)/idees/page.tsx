import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/dal/session";
import { getIdeasState, getSelectedIdea } from "@/server/ideas/service";
import { IdeasView } from "./ideas-view";

export const metadata: Metadata = { title: "Tes 3 idées" };

// La génération continue en arrière-plan après la réponse de l'action (voir requestIdeas) : on lui laisse le temps.
export const maxDuration = 300;

export default async function IdeasPage() {
  const user = await requireUser("/idees");
  const [state, selected] = await Promise.all([getIdeasState(user.id), getSelectedIdea(user.id)]);
  return (
    <>
      {selected && (
        <div className="mx-auto mb-6 flex max-w-3xl flex-col gap-3 rounded-card border border-primary/30 bg-primary-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Tu as choisi <strong>« {selected.title} »</strong>. Ton plan d&apos;action t&apos;attend.
          </p>
          <Link href="/tableau-de-bord" className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-primary hover:underline">
            Mon plan <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
      <IdeasView state={state} />
    </>
  );
}
