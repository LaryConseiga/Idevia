CREATE TYPE "public"."idea_batch_status" AS ENUM('running', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "idea_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"diagnostic_id" uuid,
	"status" "idea_batch_status" DEFAULT 'running' NOT NULL,
	"error_code" text,
	"pipeline" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "business_ideas" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
ALTER TABLE "business_ideas" ADD COLUMN "rank" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_ideas" ADD COLUMN "content_enc" text;--> statement-breakpoint
ALTER TABLE "idea_batches" ADD CONSTRAINT "idea_batches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_batches" ADD CONSTRAINT "idea_batches_diagnostic_id_diagnostics_id_fk" FOREIGN KEY ("diagnostic_id") REFERENCES "public"."diagnostics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_batches_user_idx" ON "idea_batches" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "business_ideas" ADD CONSTRAINT "business_ideas_batch_id_idea_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."idea_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_ideas_batch_idx" ON "business_ideas" USING btree ("batch_id","rank");