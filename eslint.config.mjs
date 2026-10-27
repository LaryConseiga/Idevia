import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Isolation des données : seule la DAL (et l'auth) parle à la base, toujours via withUser/withSystem.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/dal/**", "src/server/auth/**", "src/server/db/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/db/client", "**/db/client"],
              message: "Accès direct à la base interdit : passe par src/server/dal (withUser / withSystem).",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "API-mega-list/**", "public/sw.js"]),
]);

export default eslintConfig;
