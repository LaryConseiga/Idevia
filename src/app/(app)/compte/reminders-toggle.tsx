"use client";

import { Bell } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setRemindersAction } from "./actions";

export function RemindersToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useOptimistic(enabled);
  const [pending, start] = useTransition();
  return (
    <div className="flex min-h-16 items-center gap-4 rounded-card border border-border bg-card px-5 py-4">
      <Bell className="size-5 shrink-0 text-primary" aria-hidden />
      <span className="flex-1">
        <span id="rappels-label" className="block font-medium">
          Rappels par email
        </span>
        <span className="block text-sm text-muted-foreground">Quand une étape de ton plan arrive à échéance, au plus tous les 3 jours.</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="rappels-label"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setOn(!on);
            await setRemindersAction(!on);
          })
        }
        className={cn(
          "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          on ? "bg-primary" : "bg-muted-foreground/40",
        )}
      >
        <span className={cn("inline-block size-6 rounded-full bg-white shadow transition-transform motion-reduce:transition-none", on ? "translate-x-7" : "translate-x-1")} />
      </button>
    </div>
  );
}
