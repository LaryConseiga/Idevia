import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Mise en page des pages publiques de contenu (légal, FAQ, explications). */
export function PageShell({ eyebrow, title, intro, children, wide }: { eyebrow?: string; title: string; intro?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("mx-auto px-4 py-12 sm:px-6 sm:py-16", wide ? "max-w-5xl" : "max-w-3xl")}>
      <header className="max-w-3xl">
        {eyebrow && <p className="text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>}
        <h1 className="mt-2 text-4xl leading-tight font-bold text-balance sm:text-5xl">{title}</h1>
        {intro && <div className="mt-4 text-lg leading-relaxed text-muted-foreground">{intro}</div>}
      </header>
      <div className="mt-10">{children}</div>
    </div>
  );
}

/** Texte long lisible : titres, paragraphes et listes espacés, sans plugin de typographie. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:font-sans [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:tracking-normal [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
      {children}
    </div>
  );
}

/** Information légale manquante : visible, pour qu'elle soit complétée avant la mise en ligne. */
export function Todo({ value, label }: { value: string | null; label: string }) {
  if (value) return <>{value}</>;
  return <mark className="rounded bg-highlight-soft px-1.5 py-0.5 text-highlight">[{label} : à compléter]</mark>;
}
