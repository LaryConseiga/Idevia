"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/card";
import { banUserAction, setRoleAction, unbanUserAction, type AdminResult } from "./actions";

const ROLES = [
  { value: "user", label: "Utilisateur" },
  { value: "support", label: "Support" },
  { value: "content", label: "Contenu" },
  { value: "analyst", label: "Analyste" },
  { value: "super_admin", label: "Super admin" },
];

export function UserActions(props: { userId: string; banned: boolean; role: string; canSetRole: boolean }) {
  const [reason, setReason] = useState("");
  const [role, setRole] = useState(props.role);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<AdminResult>, done: string) =>
    start(async () => {
      setMessage(null);
      const result = await fn();
      if (result.ok) {
        setReason("");
        setMessage({ tone: "success", text: done });
      } else setMessage({ tone: "error", text: result.error });
    });

  return (
    <details className="group">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
        Gérer
      </summary>
      <div className="mt-2 flex w-72 flex-col gap-2">
        <label className="text-xs font-medium" htmlFor={`reason-${props.userId}`}>
          Motif (enregistré dans le journal)
        </label>
        <input
          id={`reason-${props.userId}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-10 rounded-lg border border-input bg-background px-2.5 text-sm"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            act(
              () => (props.banned ? unbanUserAction(props.userId, reason) : banUserAction(props.userId, reason)),
              props.banned ? "Compte réactivé." : "Compte suspendu, sessions fermées.",
            )
          }
          className={
            props.banned
              ? "min-h-10 cursor-pointer rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
              : "min-h-10 cursor-pointer rounded-lg bg-destructive px-3 text-sm font-semibold text-destructive-foreground"
          }
        >
          {props.banned ? "Réactiver le compte" : "Suspendre le compte"}
        </button>
        {props.canSetRole && (
          <div className="flex gap-2">
            <label htmlFor={`role-${props.userId}`} className="sr-only">
              Rôle
            </label>
            <select
              id={`role-${props.userId}`}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="min-h-10 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending || role === props.role}
              onClick={() => act(() => setRoleAction(props.userId, role, reason), "Rôle modifié.")}
              className="min-h-10 cursor-pointer rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50"
            >
              Changer
            </button>
          </div>
        )}
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
      </div>
    </details>
  );
}
