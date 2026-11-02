-- idea_reactions : table privée, même politique que les autres (voir 0001_rls.sql).
ALTER TABLE idea_reactions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE idea_reactions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_or_system ON idea_reactions
  USING (app_is_system() OR user_id = app_current_user_id())
  WITH CHECK (app_is_system() OR user_id = app_current_user_id());
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'idevia_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE idea_reactions TO idevia_app;
  END IF;
END $$;
