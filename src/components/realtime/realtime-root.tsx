"use client";

import { createRealtimeClient } from "@neon/realtime/client";
import { RealtimeProvider } from "@neon/realtime-react";
import { useState, type ReactNode } from "react";

/**
 * Un client Realtime par page, créé dans l'arbre React : pendant le rendu serveur il ne se connecte jamais,
 * dans le navigateur il s'abonne après l'hydratation. L'URL (publique) vient du serveur en prop.
 */
export function RealtimeRoot({ url, children }: { url: string; children: ReactNode }) {
  const [client] = useState(() => createRealtimeClient({ url }));
  return <RealtimeProvider client={client}>{children}</RealtimeProvider>;
}
