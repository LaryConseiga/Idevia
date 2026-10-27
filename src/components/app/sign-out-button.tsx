"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/** Déconnexion + purge des caches du service worker (appareil partagé : rien ne doit rester). */
export function SignOutButton({ compact }: { compact?: boolean }) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    window.location.replace("/");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      aria-label={compact ? "Se déconnecter" : undefined}
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50",
        compact ? "w-11 justify-center px-0" : "mt-1 w-full",
      )}
    >
      <LogOut className="size-5" aria-hidden />
      {!compact && (pending ? "Déconnexion…" : "Se déconnecter")}
    </button>
  );
}
