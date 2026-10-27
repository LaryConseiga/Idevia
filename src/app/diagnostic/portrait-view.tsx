import { Compass, Heart, Sparkles, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import type { DiagnosticView } from "@/server/diagnostic/view";

type Portrait = NonNullable<DiagnosticView["portrait"]>;

function Section({ icon, title, items, tone }: { icon: ReactNode; title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-background/60 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 font-sans text-base font-semibold tracking-normal">
        <span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-current opacity-40" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Le « miroir » : ce qu'Idevia a compris de la personne. */
export function PortraitView({ portrait }: { portrait: Portrait }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-primary-soft/60 px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Voici ce que j&apos;ai compris de toi</p>
        <h2 className="mt-2 text-2xl leading-tight font-bold text-balance sm:text-3xl">{portrait.headline}</h2>
      </div>
      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
        <div className="max-w-prose space-y-3 text-[1.05rem] leading-relaxed">
          {portrait.summary.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Section icon={<Sparkles className="size-4" aria-hidden />} title="Tes atouts" items={portrait.strengths} tone="bg-primary-soft text-primary" />
          <Section icon={<Heart className="size-4" aria-hidden />} title="Ce qui te motive" items={portrait.drivers} tone="bg-accent-soft text-accent" />
          <Section
            icon={<TriangleAlert className="size-4" aria-hidden />}
            title="À garder en tête"
            items={portrait.watchouts}
            tone="bg-highlight-soft text-highlight"
          />
          <Section
            icon={<Compass className="size-4" aria-hidden />}
            title="Pistes à explorer"
            items={portrait.directions}
            tone="bg-primary-soft text-primary"
          />
        </div>
      </div>
    </Card>
  );
}
