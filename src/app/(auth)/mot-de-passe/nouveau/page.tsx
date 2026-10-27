import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/mot-de-passe/nouveau">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;
  return (
    <>
      <h1 className="text-3xl font-bold">Choisis un nouveau mot de passe</h1>
      <Card className="mt-6 p-6">
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Alert tone="error">
            Ce lien n&apos;est plus valide.{" "}
            <Link href="/mot-de-passe/oublie" className="font-semibold underline">
              Fais une nouvelle demande
            </Link>
            .
          </Alert>
        )}
      </Card>
    </>
  );
}
