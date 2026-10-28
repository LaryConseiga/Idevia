"use client";

import { Check, Compass, Lightbulb, MapPin, Megaphone, MessageCircle, Radar, Search, Store } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Aperçu du parcours dans une fenêtre de navigateur, avec des onglets (exemple illustratif, données fictives). */

const TABS = [
  { id: "diagnostic", label: "Diagnostic", icon: Compass },
  { id: "idees", label: "3 idées", icon: Lightbulb },
  { id: "terrain", label: "Terrain", icon: Radar },
  { id: "coach", label: "Coach", icon: MessageCircle },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function HeroDemo() {
  const [tab, setTab] = useState<TabId>("idees");
  return (
    <div className="flex flex-col items-center gap-5">
      <div role="tablist" aria-label="Découvrir le parcours" className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="demo-panel"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors",
              tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-4" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="size-3 rounded-full bg-destructive/80" aria-hidden />
          <span className="size-3 rounded-full bg-highlight/80" aria-hidden />
          <span className="size-3 rounded-full bg-success/80" aria-hidden />
          <span className="flex-1 text-center font-mono text-xs text-muted-foreground">idevia</span>
          <span className="w-12" aria-hidden />
        </div>
        <div id="demo-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-[22rem] p-5 text-left sm:p-8">
          {tab === "diagnostic" && <Diagnostic />}
          {tab === "idees" && <Ideas />}
          {tab === "terrain" && <Field />}
          {tab === "coach" && <Coach />}
        </div>
      </div>
    </div>
  );
}

function PanelTitle({ title, text }: { title: string; text: string }) {
  return (
    <>
      <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{text}</p>
    </>
  );
}

function Diagnostic() {
  return (
    <div>
      <PanelTitle title="Une question à la fois" text="Chaque question dépend de ta réponse précédente. Environ 10 minutes, sans compte pour commencer." />
      <div className="mt-6 max-w-xl rounded-2xl border border-border bg-background p-5">
        <p className="text-xs font-semibold text-primary">Question 4 sur une dizaine</p>
        <p className="mt-2 text-lg font-semibold">Qu&apos;est-ce que tes proches te demandent souvent de faire pour eux ?</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {["Coudre ou retoucher", "Cuisiner pour une fête", "Réparer un appareil", "Autre chose…"].map((o, i) => (
            <span key={o} className={cn("rounded-xl border px-3 py-2.5 text-sm", i === 0 ? "border-primary bg-primary-soft font-medium" : "border-border")}>
              {o}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ideas() {
  const ideas = [
    { rank: 1, title: "Kits mère-enfant en wax pour les baptêmes", kind: "Fabrication", tone: "border-accent/60 bg-accent-soft/40", score: 86 },
    { rank: 2, title: "Retouches express à domicile pour les bureaux", kind: "Service sur place", tone: "border-sky/60 bg-sky/5", score: 81 },
    { rank: 3, title: "Patrons de couture vendus à la diaspora", kind: "Numérique", tone: "border-violet/60 bg-violet/5", score: 74 },
  ];
  return (
    <div>
      <PanelTitle title="3 idées, classées, de natures différentes" text="Fabrication, service, agriculture, restauration, commerce ou numérique : les trois idées ne se ressemblent pas." />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {ideas.map((idea) => (
          <div key={idea.rank} className={cn("flex flex-col gap-3 rounded-2xl border p-4", idea.tone)}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">n°{idea.rank}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{idea.kind}</span>
            </div>
            <p className="font-semibold leading-snug">{idea.title}</p>
            <p className="mt-auto text-sm text-muted-foreground">
              Compatibilité <span className="font-semibold text-foreground">{idea.score}/100</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field() {
  const sources: { icon: typeof Store; label: string; text: string; tone: string }[] = [
    { icon: Store, label: "Google Maps", text: "5 ateliers visibles à Abidjan, 1 seul avec des avis", tone: "border-success/50" },
    { icon: Search, label: "Recherche Google", text: "« tenue mère fille wax » parmi les recherches associées", tone: "border-sky/50" },
    { icon: Megaphone, label: "Publicités", text: "Aucune publicité active sur ce créneau", tone: "border-highlight/50" },
  ];
  return (
    <div>
      <PanelTitle title="Vérifiée sur le terrain" text="De vraies données, sourcées et datées, puis 3 hypothèses simples à tester toi-même cette semaine." />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {sources.map((s) => (
          <div key={s.label} className={cn("rounded-2xl border bg-background p-4", s.tone)}>
            <s.icon className="size-5 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-semibold">{s.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-sm">
        <MapPin className="size-4 text-primary" aria-hidden /> Ton angle : la rapidité sur WhatsApp et l&apos;acompte sécurisé
      </p>
    </div>
  );
}

function Coach() {
  return (
    <div>
      <PanelTitle title="Un coach qui connaît ton projet" text="Ton plan, ton terrain, tes décisions : il s'en souvient, et il écrit avec toi." />
      <div className="mt-6 flex max-w-2xl flex-col gap-3">
        <Bubble side="right">Écris-moi le message WhatsApp pour mes 20 premiers contacts.</Bubble>
        <Bubble side="left">
          « Bonjour, je lance mes kits mère-enfant en pagne wax, cousus sur mesure. 30 000 FCFA l&apos;ensemble, acompte de 15 000
          FCFA pour réserver… » Envoie-le un par un, pas en diffusion : ça paraît plus sincère.
        </Bubble>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3.5 text-success" aria-hidden /> Je retiens : prix fixé à 30 000 FCFA avec un acompte de 50 %
        </p>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: ReactNode }) {
  return (
    <p
      className={cn(
        "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        side === "right" ? "self-end rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-background",
      )}
    >
      {children}
    </p>
  );
}
