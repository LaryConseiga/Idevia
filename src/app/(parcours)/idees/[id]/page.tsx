import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IdeaDetail } from "@/components/ideas/idea-detail";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/server/dal/session";
import { getIdeaDetail } from "@/server/ideas/service";
import { ChooseIdea } from "./choose-idea";

export const metadata: Metadata = { title: "Ton idée" };

export default async function IdeaPage({ params }: PageProps<"/idees/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/idees/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const idea = await getIdeaDetail(user.id, id);
  if (!idea) notFound();
  if (idea === "locked") return <Locked />;

  return (
    <IdeaDetail
      idea={idea}
      back={
        <Link href="/idees" className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Mes 3 idées
        </Link>
      }
      footer={<ChooseIdea ideaId={idea.id} selected={idea.selected} />}
    />
  );
}

function Locked() {
  return (
    <Card className="mx-auto flex max-w-xl flex-col items-start gap-4 p-6 sm:p-8">
      <Lock className="size-8 text-highlight" aria-hidden />
      <h1 className="text-2xl font-bold">Cette idée fait partie de l&apos;offre Pro</h1>
      <p className="leading-relaxed text-muted-foreground">
        Tes deux meilleures idées, leur plan détaillé et le suivi arrivent avec l&apos;offre Pro. Tu peux déjà
        explorer ta troisième idée en entier.
      </p>
      <Button asChild variant="secondary">
        <Link href="/idees">Revenir à mes idées</Link>
      </Button>
    </Card>
  );
}
