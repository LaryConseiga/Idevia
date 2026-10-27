import { Lightbulb } from "lucide-react";
import type { DiagnosticView } from "@/server/diagnostic/view";
import { cn } from "@/lib/utils";

const levels = ["Pas encore abordé", "Quelques indices", "Clair", "Très clair"];

/** « Ce que je retiens de toi » : rend visible la compréhension progressive du modèle. */
export function ProfilePanel({ view }: { view: DiagnosticView }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-sans text-base font-semibold tracking-normal">Je te connais à</h2>
          <span className="font-display text-2xl font-bold text-primary tabular-nums">{view.progress} %</span>
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={view.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Niveau de compréhension de ton profil"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.max(view.progress, 4)}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        {view.dimensions.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-3 text-sm">
            <span className={cn(d.confidence === 0 && "text-muted-foreground")}>{d.label}</span>
            <span className="flex gap-1" role="img" aria-label={levels[d.confidence]}>
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={cn("h-1.5 w-5 rounded-full transition-colors duration-300", n <= d.confidence ? "bg-primary" : "bg-muted")}
                />
              ))}
            </span>
          </li>
        ))}
      </ul>

      {view.insights.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 font-sans text-base font-semibold tracking-normal">
            <Lightbulb className="size-4 text-highlight" aria-hidden />
            Ce que je retiens
          </h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {view.insights.map((insight) => (
              <li key={insight} className="rounded-xl bg-highlight-soft px-3.5 py-2.5 text-sm leading-relaxed">
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
