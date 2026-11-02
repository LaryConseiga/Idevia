import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Extraits de l'application, reproduits tels qu'on les voit (exemple fictif, cohérent d'une étape à l'autre) :
 * ils montrent le produit au lieu de le décrire.
 */

function Snippet({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 text-sm shadow-card", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function DiagnosticSnippet() {
  return (
    <Snippet label="Question 4 sur une dizaine">
      <p className="text-base font-semibold">Qu&apos;est-ce que tes proches te demandent souvent de faire pour eux ?</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {["Coudre ou retoucher", "Cuisiner pour une fête", "Réparer un appareil", "Autre chose…"].map((o, i) => (
          <li key={o} className={cn("rounded-lg border px-3 py-2", i === 0 ? "border-accent bg-accent-soft font-medium" : "border-border")}>
            {o}
          </li>
        ))}
      </ul>
    </Snippet>
  );
}

export function IdeasSnippet() {
  const ideas = [
    { title: "Kits mère-enfant en wax pour les baptêmes", kind: "Fabrication", score: 86 },
    { title: "Retouches express à domicile pour les bureaux", kind: "Service sur place", score: 81 },
    { title: "Patrons de couture vendus à la diaspora", kind: "Numérique", score: 74 },
  ];
  return (
    <Snippet label="Tes 3 idées, de la plus adaptée à la moins adaptée">
      <ol className="divide-y divide-border">
        {ideas.map((idea, i) => (
          <li key={idea.title} className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="font-display text-lg text-accent">{i + 1}</span>
            <span className="flex-1">
              <span className="block font-medium">{idea.title}</span>
              <span className="text-xs text-muted-foreground">{idea.kind}</span>
            </span>
            <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{idea.score}/100</span>
          </li>
        ))}
      </ol>
    </Snippet>
  );
}

export function FieldSnippet() {
  const findings = [
    { source: "Google Maps", text: "5 ateliers visibles à Abidjan, un seul avec des avis clients." },
    { source: "Recherche Google", text: "« tenue mère fille wax » apparaît dans les recherches associées." },
    { source: "Publicités", text: "Aucune publicité active sur ce créneau." },
  ];
  return (
    <Snippet label="Vérification terrain · Abidjan">
      <ul className="flex flex-col gap-2.5">
        {findings.map((f) => (
          <li key={f.source}>
            <span className="text-xs font-semibold text-muted-foreground">{f.source}</span>
            <p>{f.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-border pt-3 font-medium">Ton angle : la rapidité sur WhatsApp et l&apos;acompte sécurisé.</p>
    </Snippet>
  );
}

export function CoachSnippet() {
  return (
    <Snippet label="Coach">
      <div className="flex flex-col gap-2.5">
        <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-muted px-3.5 py-2.5">
          Écris-moi le message WhatsApp pour mes 20 premiers contacts.
        </p>
        <p className="max-w-[92%] rounded-2xl rounded-bl-md border border-border px-3.5 py-2.5 leading-relaxed">
          « Bonjour, je lance mes kits mère-enfant en pagne wax, cousus sur mesure. 30 000 FCFA l&apos;ensemble, acompte de 15 000
          FCFA pour réserver… » Envoie-le un par un, pas en diffusion : ça paraît plus sincère.
        </p>
        <p className="text-xs text-muted-foreground">Retenu : prix fixé à 30 000 FCFA avec un acompte de 50 %.</p>
      </div>
    </Snippet>
  );
}
