ALTER TABLE "profiles" ADD COLUMN "first_name" varchar(120);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_name" varchar(120);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_first_name_not_empty" CHECK ("profiles"."first_name" is null or char_length(trim("profiles"."first_name")) > 0);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_last_name_not_empty" CHECK ("profiles"."last_name" is null or char_length(trim("profiles"."last_name")) > 0);