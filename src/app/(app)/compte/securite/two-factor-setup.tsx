"use client";

import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

type Step = { kind: "password" } | { kind: "scan"; qrSvg: string; secret: string; backupCodes: string[] } | { kind: "done" };

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "password" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError(null);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setPending(false);
    if (error || !data || data.method !== "totp") {
      setError(authErrorMessage(error));
      return;
    }
    const qrSvg = await QRCode.toString(data.totpURI, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    const secret = new URL(data.totpURI).searchParams.get("secret") ?? "";
    setStep({ kind: "scan", qrSvg, secret, backupCodes: data.backupCodes });
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setPending(true);
    setError(null);
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setStep({ kind: "done" });
    router.refresh();
  }

  if (enabled || step.kind === "done") {
    return <Alert tone="success">La double authentification est active sur ton compte.</Alert>;
  }

  if (step.kind === "scan") {
    return (
      <div className="flex flex-col gap-6">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Ouvre une application d&apos;authentification (Google Authenticator, Microsoft Authenticator, Aegis…).</li>
          <li>Scanne ce QR code, ou saisis la clé manuellement.</li>
          <li>Saisis le code à 6 chiffres affiché pour confirmer.</li>
        </ol>
        <div className="flex flex-col items-center gap-3">
          {/* SVG généré localement par la bibliothèque qrcode à partir de l'URI TOTP. */}
          <div
            className="size-48 rounded-xl bg-white p-2"
            role="img"
            aria-label="QR code de configuration"
            dangerouslySetInnerHTML={{ __html: step.qrSvg }}
          />
          <code className="rounded-lg bg-muted px-3 py-1.5 text-sm break-all">{step.secret}</code>
        </div>
        <Alert tone="warning">
          <p className="font-semibold">Note tes codes de secours dans un endroit sûr</p>
          <p className="mt-1">Chacun te permet de te connecter une fois si tu perds ton téléphone.</p>
          <ul className="mt-3 grid grid-cols-2 gap-1 font-mono text-sm">
            {step.backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Alert>
        <form onSubmit={confirm} className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Code à 6 chiffres" required>
            {({ id }) => (
              <Input id={id} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required className="tracking-[0.3em]" />
            )}
          </Field>
          <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
            Activer
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={start} className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Confirme ton mot de passe" required>
        {({ id }) => <PasswordInput id={id} name="password" autoComplete="current-password" required />}
      </Field>
      <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
        Configurer la double authentification
      </Button>
    </form>
  );
}
