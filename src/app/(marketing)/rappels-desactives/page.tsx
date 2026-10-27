import { BellOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Rappels désactivés", robots: { index: false } };

export default function RemindersOffPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-16 sm:py-24">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <BellOff className="size-6" aria-hidden />
      </span>
      <h1 className="text-3xl font-bold">C&apos;est noté, plus de rappels</h1>
      <p className="leading-relaxed text-muted-foreground">
        Tu ne recevras plus d&apos;email quand une étape de ton plan arrive à échéance. Tes emails de connexion et de
        sécurité continuent d&apos;arriver normalement. Tu peux réactiver les rappels à tout moment depuis ton compte.
      </p>
      <Button asChild variant="secondary">
        <Link href="/compte">Aller à mon compte</Link>
      </Button>
    </section>
  );
}
