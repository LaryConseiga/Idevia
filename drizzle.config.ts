import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations : rôle propriétaire et connexion directe (le pooler ne garde pas l'état de session).
  // sslmode=verify-full : mêmes vérifications que « require » aujourd'hui, sans l'avertissement de pg.
  dbCredentials: {
    url: (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!).replace("sslmode=require", "sslmode=verify-full"),
  },
  strict: true,
  verbose: true,
});
