CREATE TABLE "diagnostic_progress" (
	"user_id" text PRIMARY KEY NOT NULL,
	"diagnostic_id" uuid NOT NULL,
	"status" "diagnostic_status" NOT NULL,
	"turn_count" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diagnostic_progress" ADD CONSTRAINT "diagnostic_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;