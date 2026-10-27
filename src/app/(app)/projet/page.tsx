import { Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/server/dal/session";
import { getProjectView } from "@/server/projects/service";
import { ProjectView } from "./project-view";

export const metadata: Metadata = { title: "Mon projet" };

// La vérification terrain continue en arrière-plan après la réponse de l'action : on lui laisse le temps.
export const maxDuration = 300;

export default async function ProjectPage() {
  const user = await requireUser("/projet");
  const project = await getProjectView(user.id);
  if (!project) {
    return (
      <Card className="mx-auto flex max-w-xl flex-col items-start gap-4 p-6 sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Lightbulb className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold">Ton projet commence par une idée</h1>
        <p className="leading-relaxed text-muted-foreground">
          Choisis l&apos;idée qui te donne envie : son plan des 30 premiers jours deviendra ici ta liste d&apos;actions, et tu
          pourras la vérifier sur le terrain.
        </p>
        <Button asChild variant="cta">
          <Link href="/idees">Voir mes idées</Link>
        </Button>
      </Card>
    );
  }
  return <ProjectView project={project} />;
}
