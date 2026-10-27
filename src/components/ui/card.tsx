import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card border border-border bg-card text-card-foreground shadow-card", className)}
      {...props}
    />
  );
}

type AlertProps = ComponentProps<"div"> & { tone?: "info" | "success" | "error" | "warning" };

const tones = {
  info: "border-primary/25 bg-primary-soft text-foreground",
  success: "border-success/30 bg-success-soft text-foreground",
  error: "border-destructive/30 bg-destructive-soft text-foreground",
  warning: "border-highlight/30 bg-highlight-soft text-foreground",
};

export function Alert({ className, tone = "info", ...props }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}
      {...props}
    />
  );
}
