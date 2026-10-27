CREATE TYPE "public"."field_check_status" AS ENUM('running', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "field_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "field_check_status" DEFAULT 'running' NOT NULL,
	"error_code" text,
	"report_enc" text,
	"trace" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "period" text;--> statement-breakpoint
ALTER TABLE "validations" ADD COLUMN "field_check_id" uuid;--> statement-breakpoint
ALTER TABLE "field_checks" ADD CONSTRAINT "field_checks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_checks" ADD CONSTRAINT "field_checks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "field_checks_project_idx" ON "field_checks" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "field_checks_user_idx" ON "field_checks" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "validations" ADD CONSTRAINT "validations_field_check_id_field_checks_id_fk" FOREIGN KEY ("field_check_id") REFERENCES "public"."field_checks"("id") ON DELETE set null ON UPDATE no action;