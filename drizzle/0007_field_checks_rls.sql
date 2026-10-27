-- field_checks : table privée, même politique que les autres (voir 0001_rls.sql).
ALTER TABLE field_checks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE field_checks FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_or_system ON field_checks
  USING (app_is_system() OR user_id = app_current_user_id())
  WITH CHECK (app_is_system() OR user_id = app_current_user_id());
--> statement-breakpoint
-- Un seul projet actif par personne : le choix d'une autre idée archive le précédent.
CREATE UNIQUE INDEX IF NOT EXISTS projects_one_active_per_user ON projects (user_id) WHERE status = 'active';
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'idevia_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE field_checks TO idevia_app;
  END IF;
END $$;
