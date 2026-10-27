"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export default function TwoFactorPage() {
  const router = useRouter();
  const [useBackup, setUseBackup] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setPending(true);
    setError(null);
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
    setPending(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    router.replace("/tableau-de-bord");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Vérification en deux étapes</h1>
      <p className="mt-2 text-muted-foreground">
        {useBackup
          ? "Saisis l'un de tes codes de secours."
          : "Saisis le code à 6 chiffres affiché dans ton application d'authentification."}
      </p>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label={useBackup ? "Code de secours" : "Code à 6 chiffres"} required>
            {({ id }) => (
              <Input
                id={id}
                name="code"
                required
                autoComplete="one-time-code"
                inputMode={useBackup ? "text" : "numeric"}
                pattern={useBackup ? undefined : "[0-9 ]{6,7}"}
                maxLength={useBackup ? 32 : 7}
                className="text-center text-xl tracking-[0.3em] tabular-nums"
              />
            )}
          </Field>
          <Button type="submit" variant="cta" disabled={pending} aria-busy={pending}>
            {pending ? "Vérification…" : "Vérifier"}
          </Button>
          <button
            type="button"
            className="cursor-pointer self-center text-sm font-medium text-primary hover:underline"
            onClick={() => setUseBackup((v) => !v)}
          >
            {useBackup ? "Utiliser mon application" : "Utiliser un code de secours"}
          </button>
        </form>
      </Card>
    </>
  );
}
