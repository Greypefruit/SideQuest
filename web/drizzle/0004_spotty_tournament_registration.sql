ALTER TYPE "public"."competition_status" ADD VALUE IF NOT EXISTS 'registration';--> statement-breakpoint
ALTER TYPE "public"."competition_status" ADD VALUE IF NOT EXISTS 'ready';--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "max_participants" integer DEFAULT 16 NOT NULL;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_max_participants_positive" CHECK ("competitions"."max_participants" >= 2);--> statement-breakpoint
