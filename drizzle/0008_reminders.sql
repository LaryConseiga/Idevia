ALTER TABLE "profiles" ADD COLUMN "email_reminders" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "last_reminder_at" timestamp with time zone;