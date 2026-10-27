import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCoachView } from "@/server/assistant/service";
import { requireUser } from "@/server/dal/session";
import { Coach } from "./coach";

export const metadata: Metadata = { title: "Mon coach" };

export default async function AssistantPage({ searchParams }: PageProps<"/assistant">) {
  const user = await requireUser("/assistant");
  const [view, params] = await Promise.all([getCoachView(user.id), searchParams]);
  if (!view) {
    return (
      <Card className="mx-auto flex max-w-xl flex-col items-start gap-4 p-6 sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <MessageCircle className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold">Ton coach t&apos;attend sur ton projet</h1>
        <p className="leading-relaxed text-muted-foreground">
          Choisis d&apos;abord ton idée : le coach connaîtra ton plan, ce que dit le terrain et où tu en es, pour t&apos;aider
          à chaque étape.
        </p>
        <Button asChild variant="cta">
          <Link href="/idees">Voir mes idées</Link>
        </Button>
      </Card>
    );
  }
  // Question préparée depuis une étape du plan (« Je bloque »).
  const draft = typeof params.question === "string" ? params.question.slice(0, 500) : "";
  return <Coach view={view} draft={draft} />;
}
