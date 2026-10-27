"use client";

import type { SealedLiveQuery } from "@neon/realtime/client";
import { useLiveQuery } from "@neon/realtime-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeRoot } from "@/components/realtime/realtime-root";
import type { DiagnosticProgressRow } from "@/server/realtime";

type Props = {
  url: string;
  userId: string;
  sealedQuery: SealedLiveQuery<DiagnosticProgressRow>;
  initialData: DiagnosticProgressRow[];
};

/** Synchronise la carte du diagnostic quand l'utilisateur répond depuis un autre appareil. */
export function DiagnosticLive(props: Props) {
  return (
    <RealtimeRoot url={props.url}>
      <Progress {...props} />
    </RealtimeRoot>
  );
}

// Réinitialisé par un rechargement complet de la page.
let signedOut = false;

function Progress({ userId, sealedQuery, initialData }: Omit<Props, "url">) {
  const router = useRouter();
  // Un rendu serveur (router.refresh) renvoie un nouvel objet : on garde le premier, les renouvellements passent par refreshQuery.
  const [query] = useState(sealedQuery);

  const refreshQuery = useCallback(async () => {
    if (signedOut) throw new Error("Session terminée");
    const res = await fetch("/api/realtime/diagnostic", { method: "POST", body: JSON.stringify({ userId }) });
    if (res.status === 401) {
      // Déconnexion ou autre compte dans un autre onglet : on quitte la page plutôt que d'afficher d'anciennes données.
      signedOut = true;
      window.location.reload();
      throw new Error("Session terminée");
    }
    if (!res.ok) throw new Error(`Renouvellement impossible (${res.status})`);
    return (await res.json()) as SealedLiveQuery<DiagnosticProgressRow>;
  }, [userId]);

  const { data, status } = useLiveQuery(query, { refreshQuery, initialData });

  // Une réponse donnée ailleurs : la carte (rendue côté serveur, avec le portrait chiffré) est recalculée.
  const row = (data ?? initialData)[0];
  const signature = row ? `${row.id}:${row.status}:${row.turn_count}` : "aucun";
  const first = useRef(initialData[0] ? `${initialData[0].id}:${initialData[0].status}:${initialData[0].turn_count}` : "aucun");
  useEffect(() => {
    if (signature !== first.current) {
      first.current = signature;
      router.refresh();
    }
  }, [signature, router]);

  return (
    <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground" data-realtime-status={status}>
      <span
        aria-hidden
        className={status === "live" ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-muted-foreground/40"}
      />
      {status === "live" ? "Synchronisé en direct avec tes autres appareils" : "Connexion à la synchronisation…"}
    </p>
  );
}
