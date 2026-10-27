import { cn } from "@/lib/utils";

/** Score de compatibilité sur 100, lisible sans la couleur (le nombre est toujours écrit). */
export function ScoreRing({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: 44, md: 60, lg: 84 }[size];
  const stroke = size === "lg" ? 7 : 5;
  const r = (dims - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: dims, height: dims }}
      role="img"
      aria-label={`Compatible à ${score} %`}
    >
      <svg width={dims} height={dims} className="-rotate-90" aria-hidden>
        <circle cx={dims / 2} cy={dims / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className={cn("absolute font-display font-bold tabular-nums", size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-xs")}>
        {score}
        <span className="text-[0.6em] font-semibold">%</span>
      </span>
    </span>
  );
}

export const RANK_LABELS: Record<number, string> = {
  1: "La plus adaptée à toi",
  2: "Une belle alternative",
  3: "Une autre piste",
};
