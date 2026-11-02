CREATE TYPE "public"."idea_reaction_reason" AS ENUM('interested', 'not_for_me', 'budget', 'skills', 'domain', 'none');--> statement-breakpoint
CREATE TABLE "idea_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"batch_id" uuid NOT NULL,
	"idea_id" uuid,
	"reason" "idea_reaction_reason" NOT NULL,
	"comment_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idea_reactions_batch_idea_uq" UNIQUE NULLS NOT DISTINCT("batch_id","idea_id"),
	CONSTRAINT "idea_reactions_target_ck" CHECK (("idea_reactions"."reason" = 'none') = ("idea_reactions"."idea_id" is null))
);
--> statement-breakpoint
ALTER TABLE "idea_batches" ADD COLUMN "reserve_enc" text;--> statement-breakpoint
ALTER TABLE "idea_reactions" ADD CONSTRAINT "idea_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_reactions" ADD CONSTRAINT "idea_reactions_batch_id_idea_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."idea_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_reactions" ADD CONSTRAINT "idea_reactions_idea_id_business_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."business_ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_reactions_user_idx" ON "idea_reactions" USING btree ("user_id");