import type { Metadata } from "next";
import { Alert, Card } from "@/components/ui/card";
import { isAdminRole, requireUser } from "@/server/dal/session";
import { TwoFactorSetup } from "./two-factor-setup";

export const metadata: Metadata = { title: "Sécurité du compte" };

export default async function SecurityPage({ searchParams }: PageProps<"/compte/securite">) {
  const user = await requireUser("/compte/securite");
  const { raison } = await searchParams;

  return (
    <>
      <h1 className="text-3xl font-bold">Sécurité</h1>
      {raison === "2fa-admin" && (
        <Alert tone="warning" className="mt-6">
          L&apos;accès à l&apos;administration exige la double authentification. Active-la ci-dessous.
        </Alert>
      )}
      <Card className="mt-6 p-6">
        <h2 className="font-sans text-lg font-semibold tracking-normal">Double authentification</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Un code temporaire, généré par ton téléphone, est demandé en plus du mot de passe.
          {isAdminRole(user.role) ? " Obligatoire pour les comptes d'administration." : " Recommandé."}
        </p>
        <TwoFactorSetup enabled={user.twoFactorEnabled} />
      </Card>
    </>
  );
}
