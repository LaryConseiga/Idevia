"use client";

import { Mail, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, safeNextPath } from "@/lib/auth-errors";
import { cn } from "@/lib/utils";

type Mode = "password" | "magic";

export function LoginForm({ next }: { next: string | undefined }) {
  const router = useRouter();
  const destination = safeNextPath(next);
  const [mode, setMode] = useState<Mode>("password");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setPending(true);
    setError(null);

    if (mode === "magic") {
      const { error } = await authClient.signIn.magicLink({ email, callbackURL: destination });
      setPending(false);
      // Même message que le compte existe ou non (pas d'énumération).
      if (error && error.status === 429) setError(authErrorMessage(error));
      else setMagicSentTo(email);
      return;
    }

    const { error } = await authClient.signIn.email({
      email,
      password: String(form.get("password") ?? ""),
      callbackURL: destination,
    });
    setPending(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    // Rattachement du diagnostic (route serveur, pas une page) : navigation complète.
    if (destination.startsWith("/diagnostic/rattacher")) {
      window.location.assign(destination);
      return;
    }
    router.replace(destination);
    router.refresh();
  }

  if (magicSentTo) {
    return (
      <Alert tone="success">
        <p className="font-semibold">Vérifie ta boîte mail</p>
        <p className="mt-1">
          Si un compte existe pour <strong>{magicSentTo}</strong>, tu vas recevoir un lien de connexion valable 10
          minutes. Pense à regarder dans les spams.
        </p>
      </Alert>
    );
  }

  return (
    <div>
      <div role="tablist" aria-label="Méthode de connexion" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            { id: "password", label: "Mot de passe", icon: KeyRound },
            { id: "magic", label: "Lien par email", icon: Mail },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={() => {
              setMode(tab.id);
              setError(null);
            }}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
              mode === tab.id ? "bg-card shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-4" aria-hidden />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5" noValidate={false}>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Adresse email" required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              aria-describedby={describedBy}
              aria-invalid={invalid}
            />
          )}
        </Field>

        {mode === "password" && (
          <Field label="Mot de passe" required>
            {({ id, describedBy }) => (
              <PasswordInput id={id} name="password" autoComplete="current-password" required aria-describedby={describedBy} />
            )}
          </Field>
        )}

        <Button type="submit" variant="cta" disabled={pending} aria-busy={pending}>
          {pending ? "Un instant…" : mode === "password" ? "Me connecter" : "Recevoir mon lien"}
        </Button>

        {mode === "password" && (
          <Link href="/mot-de-passe/oublie" className="self-center text-sm font-medium text-primary hover:underline">
            Mot de passe oublié ?
          </Link>
        )}
      </form>
    </div>
  );
}
