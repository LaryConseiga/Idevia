/**
 * Chiffre les textes personnels encore stockés en clair dans des colonnes devenues chiffrées
 * (titres et accroches d'idées, nom du projet, étapes du plan, hypothèses, ville du profil), et remplace les adresses IP
 * des sessions par leur pseudonyme. Sans effet sur ce qui est déjà chiffré : on peut le relancer sans risque.
 *
 * Usage : npm run db:seal            (affiche ce qui serait chiffré)
 *         npm run db:seal -- --apply (chiffre)
 */
import pg from "pg";
import { isSealed, pseudonym, seal } from "@/server/crypto";

const COLUMNS: Record<string, { key: string; columns: string[] }> = {
  business_ideas: { key: "id", columns: ["title", "summary"] },
  projects: { key: "id", columns: ["name"] },
  tasks: { key: "id", columns: ["title", "description", "expected_result"] },
  validations: { key: "id", columns: ["hypothesis", "test_description", "success_criteria"] },
  profiles: { key: "user_id", columns: ["city"] },
};
const apply = process.argv.includes("--apply");
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant.");

const client = new pg.Client({ connectionString: url.replace("sslmode=require", "sslmode=verify-full") });
await client.connect();
try {
  await client.query("begin");
  for (const [table, { key, columns }] of Object.entries(COLUMNS)) {
    const { rows } = await client.query<Record<string, string | null>>(`select ${key} as id, ${columns.join(", ")} from ${table}`);
    let changed = 0;
    for (const row of rows) {
      const updates = columns.filter((c) => row[c] !== null && !isSealed(row[c]!));
      if (!updates.length) continue;
      changed++;
      if (apply) {
        const set = updates.map((c, i) => `${c} = $${i + 2}`).join(", ");
        await client.query(`update ${table} set ${set} where ${key} = $1`, [row.id, ...updates.map((c) => seal(row[c]!))]);
      }
    }
    console.log(`${table} : ${changed} ligne(s) ${apply ? "chiffrée(s)" : "à chiffrer"} sur ${rows.length}`);
  }
  // Une adresse IP contient « . » (IPv4) ou « : » (IPv6) ; un pseudonyme, jamais.
  const { rows: sessions } = await client.query<{ id: string; ip_address: string }>(
    `select id, ip_address from "session" where ip_address ~ '[.:]'`,
  );
  if (apply) {
    for (const s of sessions) await client.query(`update "session" set ip_address = $2 where id = $1`, [s.id, pseudonym(s.ip_address)]);
  }
  console.log(`session : ${sessions.length} adresse(s) IP ${apply ? "remplacée(s) par un pseudonyme" : "à pseudonymiser"}`);
  await client.query(apply ? "commit" : "rollback");
  if (!apply) console.log("\nRien n'a été modifié. Relance avec --apply pour chiffrer.");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
