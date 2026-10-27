"use client";

import { Download, Trash2, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { cancelDeletionAction, requestDeletionAction } from "../actions-deletion";

export function DeletionForm({ scheduledFor }: { scheduledFor: string | null }) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (scheduledFor) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6 sm:p-8">
        <Alert tone="warning">
          Ton compte et toutes tes données seront effacés définitivement le <strong>{scheduledFor}</strong>.
        </Alert>
        <p className="leading-relaxed text-muted-foreground">
          D&apos;ici là, tout fonctionne normalement et tu peux changer d&apos;avis. Les rappels par email sont coupés ; tu
          pourras les réactiver depuis ton compte si tu restes.
        </p>
        <Button variant="primary" disabled={pending} onClick={() => start(async () => void (await cancelDeletionAction()))}>
          <Undo2 aria-hidden /> {pending ? "Un instant…" : "Annuler la suppression"}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8">
      <p className="leading-relaxed">
        Tout sera effacé : ton compte, ton diagnostic, tes idées, ton projet, tes vérifications terrain et tes échanges
        avec le coach. Tu as <strong>30 jours</strong> pour changer d&apos;avis, ensuite c&apos;est définitif.
      </p>
      <a href="/compte/donnees" className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-primary hover:underline">
        <Download className="size-4" aria-hidden /> Télécharger mes données avant
      </a>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null);
            const result = await requestDeletionAction(confirmation);
            if (!result.ok) setError(result.error ?? "Un souci est survenu.");
          });
        }}
      >
        <label htmlFor="confirmation" className="text-sm font-medium">
          Pour confirmer, écris <strong>SUPPRIMER</strong>
        </label>
        <input
          id="confirmation"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          className="min-h-12 rounded-xl border border-input bg-background px-4 text-base"
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" variant="destructive" className="self-start" disabled={pending || confirmation.trim().toUpperCase() !== "SUPPRIMER"}>
          <Trash2 aria-hidden /> {pending ? "Un instant…" : "Supprimer mon compte"}
        </Button>
      </form>
    </Card>
  );
}
