-- idea_batches : table privée, même politique que les autres (voir 0001_rls.sql).
ALTER TABLE idea_batches ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE idea_batches FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY owner_or_system ON idea_batches
  USING (app_is_system() OR user_id = app_current_user_id())
  WITH CHECK (app_is_system() OR user_id = app_current_user_id());
--> statement-breakpoint
-- Les privilèges par défaut (0001) couvrent les nouvelles tables ; on le rend explicite.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'idevia_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE idea_batches TO idevia_app;
  END IF;
END $$;
