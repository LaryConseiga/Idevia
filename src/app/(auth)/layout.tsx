import { connection } from "next/server";
import { Logo } from "@/components/logo";

// Rendu entièrement dynamique : nécessaire pour la CSP à nonce (voir src/proxy.ts).
export const instant = false;

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--primary-soft),transparent)]">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main id="contenu" className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
