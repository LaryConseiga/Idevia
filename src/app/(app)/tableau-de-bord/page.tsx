import { ArrowRight, Compass, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/server/dal/session";
import { hasAnonymousToClaim, loadDiagnosticView } from "@/server/diagnostic/service";
import { loadDiagnosticProgress, realtimeUrl } from "@/server/realtime";
import { DiagnosticLive } from "./diagnostic-live";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const user = await requireUser("/tableau-de-bord");
  // Un entretien commencé avant l'inscription attend d'être rattaché au compte.
  if (await hasAnonymousToClaim()) redirect("/diagnostic/rattacher");

  const [diagnostic, progress] = await Promise.all([loadDiagnosticView(), loadDiagnosticProgress(user.id)]);
  const live =
    progress && realtimeUrl ? (
      <DiagnosticLive url={realtimeUrl} userId={user.id} sealedQuery={progress.sealedQuery} initialData={progress.initialData} />
    ) : null;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <h1 className="text-3xl font-bold sm:text-4xl">Bonjour {firstName}</h1>
      <p className="mt-2 text-muted-foreground">Voici où en est ton aventure entrepreneuriale.</p>

      {diagnostic?.status === "completed" && diagnostic.portrait ? (
        <Card className="mt-8 flex flex-col gap-4 p-6 sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Sparkles className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">Ton portrait</p>
            <h2 className="mt-1 text-2xl leading-tight font-bold text-balance">{diagnostic.portrait.headline}</h2>
          </div>
          <p className="text-muted-foreground">
            Les idées de business construites à partir de ce portrait arrivent très bientôt dans ton espace.
          </p>
          <Button asChild variant="secondary" className="self-start">
            <Link href="/diagnostic">Revoir mon portrait</Link>
          </Button>
          {live}
        </Card>
      ) : (
        <Card className="mt-8 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Compass className="size-7" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="font-sans text-xl font-semibold tracking-normal">
              {diagnostic ? "Ton diagnostic est en cours" : "Tu n'as pas encore de projet"}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {diagnostic
                ? diagnostic.answered === 0
                  ? "Ta première question t'attend."
                  : `Tu as déjà répondu à ${diagnostic.answered} question${diagnostic.answered > 1 ? "s" : ""}. Reprends là où tu en étais.`
                : "Commence par le diagnostic : quelques questions pour que je comprenne qui tu es et ce que tu veux construire."}
            </p>
            {live}
          </div>
          <Button asChild variant="cta">
            <Link href="/diagnostic">
              {diagnostic ? "Reprendre" : "Commencer"} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Card>
      )}
    </>
  );
}
