"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "idevia:install-dismissed";

/** Enregistre le service worker et propose l'installation, discrètement et une seule fois. */
export function Pwa() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {}
      setPromptEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!promptEvent) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setPromptEvent(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Installer Idevia"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center gap-3 rounded-card border border-border bg-card p-4 shadow-card md:bottom-6"
    >
      <Download className="size-6 shrink-0 text-primary" aria-hidden />
      <p className="flex-1 text-sm">
        <span className="font-semibold">Installe Idevia</span> pour retrouver ton projet en un geste, même avec une
        connexion faible.
      </p>
      <Button
        size="sm"
        onClick={async () => {
          await promptEvent.prompt();
          await promptEvent.userChoice;
          dismiss();
        }}
      >
        Installer
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Plus tard"
        className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}
