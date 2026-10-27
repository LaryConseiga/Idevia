/**
 * Donne un rôle d'administration à un compte existant (le premier super administrateur, notamment).
 * L'accès à /admin exige ensuite d'activer la double authentification depuis « Mon compte » → « Sécurité ».
 *
 * Usage : npm run admin:promote -- adresse@exemple.com [super_admin|support|content|analyst|user]
 */
import pg from "pg";

const [email, role = "super_admin"] = process.argv.slice(2);
const ROLES = ["super_admin", "support", "content", "analyst", "user"];
if (!email || !ROLES.includes(role)) {
  console.error(`Usage : npm run admin:promote -- adresse@exemple.com [${ROLES.join("|")}]`);
  process.exit(1);
}
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant.");

const client = new pg.Client({ connectionString: url.replace("sslmode=require", "sslmode=verify-full") });
await client.connect();
try {
  await client.query("begin");
  const { rows } = await client.query(`update "user" set role = $1 where lower(email) = lower($2) returning id, two_factor_enabled`, [role, email]);
  if (!rows.length) {
    await client.query("rollback");
    console.error("Aucun compte avec cette adresse. Crée d'abord le compte depuis /inscription.");
    process.exit(1);
  }
  // Trace dans le journal d'audit, comme toute action d'administration.
  await client.query(
    `insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason) values (null, $1, 'user', $2, 'script admin:promote')`,
    [`user.role.${role}`, rows[0].id],
  );
  await client.query("commit");
  console.log(`Rôle « ${role} » attribué.`);
  if (role !== "user" && !rows[0].two_factor_enabled) {
    console.log("Étape suivante : se connecter, puis activer la double authentification dans Mon compte → Sécurité.");
  }
} finally {
  await client.end();
}
