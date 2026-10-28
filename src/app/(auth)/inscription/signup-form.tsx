"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, safeNextPath } from "@/lib/auth-errors";

export function SignupForm({ next }: { next: string | undefined }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (password.length < 10) {
      setPasswordError("Au moins 10 caractères.");
      return;
    }
    setPasswordError(undefined);
    setPending(true);
    setError(null);
    const { data, error } = await authClient.signUp.email({
      name: String(form.get("name") ?? "").trim(),
      email,
      password,
      callbackURL: safeNextPath(next),
    });
    if (error) {
      setPending(false);
      setError(authErrorMessage(error));
      return;
    }
    // Compte ouvert et connecté tout de suite : navigation complète pour que le cookie de session s'applique.
    if (data?.token) {
      window.location.assign(safeNextPath(next));
      return;
    }
    setPending(false);
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <Alert tone="success">
        <p className="font-semibold">Plus qu&apos;une étape</p>
        <p className="mt-1">
          Nous avons envoyé un lien de confirmation à <strong>{sentTo}</strong>. Clique dessus pour activer ton compte
          (pense à regarder dans les spams).
        </p>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Prénom" hint="C'est ainsi qu'Idevia s'adressera à toi." required>
        {({ id, describedBy }) => (
          <Input id={id} name="name" autoComplete="given-name" required maxLength={60} aria-describedby={describedBy} />
        )}
      </Field>
      <Field label="Adresse email" required>
        {({ id, describedBy }) => (
          <Input id={id} name="email" type="email" inputMode="email" autoComplete="email" required aria-describedby={describedBy} />
        )}
      </Field>
      <Field label="Mot de passe" hint="10 caractères minimum. Une phrase courte est plus facile à retenir." error={passwordError} required>
        {({ id, describedBy, invalid }) => (
          <PasswordInput
            id={id}
            name="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
            aria-describedby={describedBy}
            aria-invalid={invalid}
          />
        )}
      </Field>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
        <span>
          J&apos;accepte les{" "}
          <Link href="/legal/conditions" className="font-medium text-primary underline" target="_blank">
            conditions d&apos;utilisation
          </Link>{" "}
          et j&apos;ai lu la{" "}
          <Link href="/legal/confidentialite" className="font-medium text-primary underline" target="_blank">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>
      <Button type="submit" variant="cta" disabled={pending} aria-busy={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
