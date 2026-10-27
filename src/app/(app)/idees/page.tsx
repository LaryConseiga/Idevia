import type { Metadata } from "next";
import { requireUser } from "@/server/dal/session";
import { getIdeasState } from "@/server/ideas/service";
import { IdeasView } from "./ideas-view";

export const metadata: Metadata = { title: "Mes idées" };

// La génération continue en arrière-plan après la réponse de l'action (voir requestIdeas) : on lui laisse le temps.
export const maxDuration = 300;

export default async function IdeasPage() {
  const user = await requireUser("/idees");
  const state = await getIdeasState(user.id);
  return <IdeasView state={state} />;
}
