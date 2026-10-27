"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, magicLinkClient, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    adminClient(),
    twoFactorClient({
      onTwoFactorRedirect: () => {
        // Hors composant React : pas de routeur disponible ici.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/connexion/double-authentification";
      },
    }),
  ],
});
