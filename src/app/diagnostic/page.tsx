import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/dal/session";
import { hasAnonymousToClaim, loadDiagnosticView } from "@/server/diagnostic/service";
import { Interview } from "./interview";

export const metadata: Metadata = {
  title: "Diagnostic",
  description: "Un entretien qui s'adapte à tes réponses pour comprendre qui tu es et ce que tu veux construire.",
};

export default async function DiagnosticPage() {
  const user = await getCurrentUser();
  if (user && (await hasAnonymousToClaim())) redirect("/diagnostic/rattacher");

  const view = await loadDiagnosticView();
  return <Interview initial={view} />;
}
