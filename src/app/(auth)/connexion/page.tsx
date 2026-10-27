import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const { suivant } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold">Content de te revoir</h1>
      <p className="mt-2 text-muted-foreground">Retrouve ton projet là où tu l&apos;as laissé.</p>
      <Card className="mt-6 p-6">
        <LoginForm next={typeof suivant === "string" ? suivant : undefined} />
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/diagnostic" className="font-semibold text-primary hover:underline">
          Commence par le diagnostic
        </Link>{" "}
        ou{" "}
        <Link href="/inscription" className="font-semibold text-primary hover:underline">
          crée un compte
        </Link>
        .
      </p>
    </>
  );
}
