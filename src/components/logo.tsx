import Link from "next/link";
import { cn } from "@/lib/utils";

/** Marque : une pousse qui sort d'une ampoule stylisée — l'idée qui devient projet. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M16 25v-8.5m0 0c0-3.6 2.6-6 6.5-6 0 3.6-2.7 6-6.5 6Zm0 0c0-2.8-2-4.7-5-4.7 0 2.8 2 4.7 5 4.7Z"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="25.2" r="1.6" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex min-h-11 items-center gap-2.5 rounded-lg font-display text-xl font-bold", className)}
      aria-label="Idevia, accueil"
    >
      <LogoMark />
      <span>Idevia</span>
    </Link>
  );
}
