"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bascule entre le thème sombre (par défaut) et le thème clair. Le choix est gardé sur l'appareil
 * (localStorage) et appliqué avant l'affichage par le script du layout racine. Les deux icônes sont
 * rendues côté serveur ; le CSS montre la bonne, sans attendre l'hydratation.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const light = root.dataset.theme !== "light";
    if (light) root.dataset.theme = "light";
    else delete root.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#F6F2EA" : "#12110F");
    try {
      if (light) localStorage.setItem("idevia-theme", "light");
      else localStorage.removeItem("idevia-theme");
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour cette page seulement.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Changer de thème (clair ou sombre)"
      title="Thème clair ou sombre"
      className={cn(
        "inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Sun className="size-5 light:hidden" aria-hidden />
      <Moon className="hidden size-5 light:block" aria-hidden />
    </button>
  );
}
