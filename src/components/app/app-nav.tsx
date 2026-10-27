"use client";

import { House, Lightbulb, Rocket, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/tableau-de-bord", label: "Accueil", icon: House },
  { href: "/idees", label: "Mes idées", icon: Lightbulb },
  { href: "/projet", label: "Mon projet", icon: Rocket },
  { href: "/compte", label: "Compte", icon: UserRound },
];

export function AppNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "sidebar") {
    return (
      <nav aria-label="Navigation de l'application" className="mt-8 flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors",
              isActive(item.href) ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navigation de l'application"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                isActive(item.href) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-6" aria-hidden />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
