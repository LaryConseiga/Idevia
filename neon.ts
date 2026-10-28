import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  preview: {
    // Origines autorisées à ouvrir une connexion Realtime (ajouter le domaine de production au lancement).
    realtime: { allowedOrigins: ["http://localhost:3000", "https://idevia.vercel.app", "https://idevia.betech.live"] },
  },
  auth: false,
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
