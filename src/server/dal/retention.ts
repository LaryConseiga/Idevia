import "server-only";
import { sql } from "drizzle-orm";
import { withSystem } from "./context";

/**
 * Durées de conservation annoncées dans la politique de confidentialité, appliquées chaque nuit.
 * Les comptes supprimés et les diagnostics anonymes ont leurs propres purges (account.ts, diagnostics.ts).
 */
export function applyRetention() {
  return withSystem("purge:retention", async (tx) => {
    // Journal de consommation des modèles : le compte n'y reste que le mois en cours (quota du coach), puis anonyme.
    const usage = await tx.execute(
      sql`update ai_usage set user_id = null where user_id is not null and created_at < date_trunc('month', now())`,
    );
    // Données de marché publiques expirées, sauf celles citées comme sources dans une vérification terrain.
    const signals = await tx.execute(sql`
      delete from market_signals m
      where m.expires_at < now()
        and not exists (select 1 from project_market_signals p where p.signal_id = m.id)`);
    // Sessions et liens de connexion expirés (avec leur pseudonyme d'adresse IP).
    const sessions = await tx.execute(sql`delete from "session" where expires_at < now()`);
    const tokens = await tx.execute(sql`delete from verification where expires_at < now()`);
    return {
      usageAnonymized: usage.rowCount ?? 0,
      signals: signals.rowCount ?? 0,
      sessions: sessions.rowCount ?? 0,
      tokens: tokens.rowCount ?? 0,
    };
  });
}
