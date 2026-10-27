-- Row-Level Security : seconde couche d'isolation, indépendante de la DAL applicative.
--
-- Le rôle applicatif (idevia_app) n'est ni propriétaire des tables ni BYPASSRLS.
-- Chaque transaction positionne l'un des deux contextes (voir src/server/dal/context.ts) :
--   app.user_id   = identifiant de l'utilisateur courant   → ne voit que ses lignes ;
--   app.system    = 'on' (auth, jobs, admin agrégé)        → accès explicite et tracé.
-- Sans contexte, une requête sur une table protégée ne renvoie rien (fail closed).

CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '') $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_is_system() RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT coalesce(current_setting('app.system', true), '') = 'on' $$;
--> statement-breakpoint

-- Tables privées : chaque ligne appartient à un utilisateur.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'business_ideas', 'projects', 'validations', 'business_plans', 'tasks',
    'project_notes', 'assistant_conversations', 'assistant_messages', 'project_market_signals',
    'usage_counters', 'pro_waitlist', 'deletion_requests'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY owner_or_system ON %I USING (app_is_system() OR user_id = app_current_user_id()) '
      'WITH CHECK (app_is_system() OR user_id = app_current_user_id())', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- Diagnostics : les diagnostics anonymes (user_id NULL) ne sont accessibles qu'en contexte système,
-- la DAL vérifiant alors le hachage de session anonyme.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['diagnostics', 'diagnostic_turns'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY owner_or_system ON %I USING (app_is_system() OR (user_id IS NOT NULL AND user_id = app_current_user_id())) '
      'WITH CHECK (app_is_system() OR (user_id IS NOT NULL AND user_id = app_current_user_id()))', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- Tables internes : jamais lisibles depuis un contexte utilisateur.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ai_usage', 'analytics_events', 'admin_audit_logs', 'market_signals'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY system_only ON %I USING (app_is_system()) WITH CHECK (app_is_system())', t);
  END LOOP;
END $$;
--> statement-breakpoint

-- Signaux de marché : lisibles par un utilisateur s'ils sont rattachés à l'un de ses projets.
CREATE POLICY linked_to_own_project ON market_signals FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_market_signals pms
          WHERE pms.signal_id = market_signals.id AND pms.user_id = app_current_user_id())
);
--> statement-breakpoint

-- Blog : lecture publique des articles publiés, écriture en contexte système (admin) uniquement.
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE posts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON posts FOR SELECT USING (status = 'published' AND published_at <= now());
--> statement-breakpoint
CREATE POLICY system_write ON posts USING (app_is_system()) WITH CHECK (app_is_system());
--> statement-breakpoint

-- Catalogue : public en lecture.
ALTER TABLE api_catalog ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE api_catalog FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY public_read ON api_catalog FOR SELECT USING (true);
--> statement-breakpoint
CREATE POLICY system_write ON api_catalog USING (app_is_system()) WITH CHECK (app_is_system());
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS api_catalog_name_trgm_idx ON api_catalog USING gin (name gin_trgm_ops);
--> statement-breakpoint

-- Droits du rôle applicatif (créé hors migration : scripts/db/init-local.sql en local, console Neon en production).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'idevia_app') THEN
    GRANT USAGE ON SCHEMA public TO idevia_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO idevia_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO idevia_app;
    GRANT EXECUTE ON FUNCTION app_current_user_id(), app_is_system() TO idevia_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO idevia_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO idevia_app;
  END IF;
END $$;
