import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default async function SignupPage({ searchParams }: PageProps<"/inscription">) {
  const { suivant } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold">Crée ton espace Idevia</h1>
      <p className="mt-2 text-muted-foreground">
        Pour sauvegarder ton profil, tes idées et ton plan, et les retrouver sur tous tes appareils.
      </p>
      <Card className="mt-6 p-6">
        <SignupForm next={typeof suivant === "string" ? suivant : undefined} />
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-primary hover:underline">
          Connecte-toi
        </Link>
      </p>
    </>
  );
}
