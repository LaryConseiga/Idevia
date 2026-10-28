import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/dal/session";
import { hasAnonymousToClaim, loadDiagnosticView } from "@/server/diagnostic/service";
import { getProjectView } from "@/server/projects/service";
import { ProjectView } from "./project-view";

export const metadata: Metadata = { title: "Mon plan" };

// La vérification terrain continue en arrière-plan après la réponse de l'action : on lui laisse le temps.
export const maxDuration = 300;

/**
 * Le tableau de bord, c'est le plan d'action de l'idée validée. Avant, la personne est dans son parcours :
 * diagnostic, puis choix parmi ses 3 idées.
 */
export default async function DashboardPage() {
  const user = await requireUser("/tableau-de-bord");
  // Un entretien commencé avant l'inscription attend d'être rattaché au compte.
  if (await hasAnonymousToClaim()) redirect("/diagnostic/rattacher");
  const project = await getProjectView(user.id);
  if (!project) {
    const diagnostic = await loadDiagnosticView();
    redirect(diagnostic?.status === "completed" ? "/idees" : "/diagnostic");
  }
  return <ProjectView project={project} greeting={`Bonjour ${user.name.split(" ")[0]}`} />;
}
