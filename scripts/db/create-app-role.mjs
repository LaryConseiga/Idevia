/**
 * Crée (ou fait tourner le mot de passe de) idevia_app, le rôle avec lequel l'application se connecte :
 * ni propriétaire des tables ni BYPASSRLS, donc soumis aux politiques RLS.
 * Sur Neon, neondb_owner a BYPASSRLS : il ne doit servir qu'aux migrations.
 *
 * Usage : node --env-file=.env.local scripts/db/create-app-role.mjs [--rotate]
 * Écrit DATABASE_APP_URL (connexion poolée) dans .env.local. Le mot de passe n'est jamais affiché.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const ENV_FILE = ".env.local";
const ownerUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!ownerUrl) throw new Error("DATABASE_URL_UNPOOLED manquant : lance d'abord `neon env pull`.");

const env = readFileSync(ENV_FILE, "utf8");
const rotate = process.argv.includes("--rotate");
if (/^DATABASE_APP_URL=.+/m.test(env) && !rotate) {
  console.log("DATABASE_APP_URL existe déjà (--rotate pour changer le mot de passe).");
  process.exit(0);
}

const password = randomBytes(24).toString("base64url");
const client = new pg.Client({ connectionString: ownerUrl.replace("sslmode=require", "sslmode=verify-full") });
await client.connect();
const { rows } = await client.query("select 1 from pg_roles where rolname = 'idevia_app'");
const db = (await client.query("select current_database() as name")).rows[0].name;
// Identifiants et mot de passe ne sont pas paramétrables en DDL : le mot de passe est généré ici (base64url, sans quote).
const verb = rows.length ? "ALTER" : "CREATE";
await client.query(`${verb} ROLE idevia_app LOGIN PASSWORD '${password}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
await client.query(`GRANT CONNECT ON DATABASE "${db}" TO idevia_app`);
await client.query("GRANT USAGE ON SCHEMA public TO idevia_app");
const check = await client.query("select rolbypassrls, rolsuper from pg_roles where rolname = 'idevia_app'");
await client.end();

// Connexion poolée (hôte -pooler) pour le trafic applicatif.
const pooled = new URL(process.env.DATABASE_URL ?? ownerUrl);
pooled.username = "idevia_app";
pooled.password = password;
const line = `DATABASE_APP_URL="${pooled.toString()}"`;
writeFileSync(ENV_FILE, /^DATABASE_APP_URL=.*$/m.test(env) ? env.replace(/^DATABASE_APP_URL=.*$/m, line) : `${env.trimEnd()}\n\n# Rôle applicatif (sans BYPASSRLS), créé par scripts/db/create-app-role.mjs\n${line}\n`);
console.log(`Rôle idevia_app ${verb === "CREATE" ? "créé" : "mis à jour"} (bypassrls=${check.rows[0].rolbypassrls}, superuser=${check.rows[0].rolsuper}). DATABASE_APP_URL écrit dans ${ENV_FILE}.`);
