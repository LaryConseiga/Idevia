import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Tests d'isolation contre une vraie base Postgres (rôle applicatif sans BYPASSRLS) :
 * une personne ne doit jamais lire ni modifier les données d'une autre, même en contournant la DAL.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/isolation/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
