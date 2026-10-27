"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newPassword = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (error) setError(authErrorMessage(error));
    else setDone(true);
  }

  if (done) {
    return (
      <Alert tone="success">
        Mot de passe modifié. Par sécurité, tes autres sessions ont été déconnectées.{" "}
        <Link href="/connexion" className="font-semibold underline">
          Me connecter
        </Link>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Nouveau mot de passe" hint="10 caractères minimum." required>
        {({ id, describedBy }) => (
          <PasswordInput id={id} name="password" autoComplete="new-password" minLength={10} maxLength={128} required aria-describedby={describedBy} />
        )}
      </Field>
      <Button type="submit" variant="cta" disabled={pending} aria-busy={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
