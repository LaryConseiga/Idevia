"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setPending(true);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/mot-de-passe/nouveau" });
    setPending(false);
    if (error?.status === 429) setError(authErrorMessage(error));
    else setDone(true); // réponse identique que le compte existe ou non
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Mot de passe oublié</h1>
      <p className="mt-2 text-muted-foreground">Indique ton email : nous t&apos;enverrons un lien pour en choisir un nouveau.</p>
      <Card className="mt-6 p-6">
        {done ? (
          <Alert tone="success">
            Si un compte existe pour cette adresse, un lien valable 1 heure vient d&apos;être envoyé.
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {error && <Alert tone="error">{error}</Alert>}
            <Field label="Adresse email" required>
              {({ id }) => <Input id={id} name="email" type="email" autoComplete="email" inputMode="email" required />}
            </Field>
            <Button type="submit" variant="cta" disabled={pending} aria-busy={pending}>
              {pending ? "Envoi…" : "Recevoir le lien"}
            </Button>
          </form>
        )}
      </Card>
      <p className="mt-6 text-center text-sm">
        <Link href="/connexion" className="font-semibold text-primary hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
