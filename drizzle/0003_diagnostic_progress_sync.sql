-- Projection diagnostic_progress pour Neon Realtime (qui ne gère pas encore la RLS).
-- Elle ne contient que le statut et le nombre de réponses du diagnostic actif de chaque utilisateur.
-- Le rôle applicatif n'y a aucun droit : seul le trigger (SECURITY DEFINER, rôle propriétaire) l'écrit,
-- et seul Realtime la lit, via une requête scellée côté serveur et filtrée sur l'utilisateur de la session.

REVOKE ALL ON TABLE diagnostic_progress FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'idevia_app') THEN
    REVOKE ALL ON TABLE diagnostic_progress FROM idevia_app;
  END IF;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION sync_diagnostic_progress(uid text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE latest record;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  SELECT id, status, turn_count INTO latest FROM diagnostics
  WHERE user_id = uid AND status IN ('in_progress', 'portrait_ready', 'completed')
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    DELETE FROM diagnostic_progress WHERE user_id = uid;
    RETURN;
  END IF;

  -- L'utilisateur a pu être supprimé dans la même transaction (cascade) : on n'écrit que s'il existe.
  INSERT INTO diagnostic_progress (user_id, diagnostic_id, status, turn_count, updated_at)
  SELECT uid, latest.id, latest.status, latest.turn_count, now()
  WHERE EXISTS (SELECT 1 FROM "user" WHERE id = uid)
  ON CONFLICT (user_id) DO UPDATE
    SET diagnostic_id = EXCLUDED.diagnostic_id, status = EXCLUDED.status,
        turn_count = EXCLUDED.turn_count, updated_at = EXCLUDED.updated_at
    WHERE (diagnostic_progress.diagnostic_id, diagnostic_progress.status, diagnostic_progress.turn_count)
      IS DISTINCT FROM (EXCLUDED.diagnostic_id, EXCLUDED.status, EXCLUDED.turn_count);
END $$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION sync_diagnostic_progress(text) FROM PUBLIC;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION diagnostics_progress_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM sync_diagnostic_progress(NEW.user_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM sync_diagnostic_progress(OLD.user_id);
  ELSE
    PERFORM sync_diagnostic_progress(OLD.user_id);
    -- Rattachement d'un diagnostic anonyme à un compte.
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN PERFORM sync_diagnostic_progress(NEW.user_id); END IF;
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint

CREATE TRIGGER diagnostics_progress_sync
AFTER INSERT OR DELETE OR UPDATE OF status, turn_count, user_id ON diagnostics
FOR EACH ROW EXECUTE FUNCTION diagnostics_progress_trigger();
--> statement-breakpoint

-- Diagnostics déjà existants.
SELECT sync_diagnostic_progress(user_id) FROM (SELECT DISTINCT user_id FROM diagnostics WHERE user_id IS NOT NULL) u;
