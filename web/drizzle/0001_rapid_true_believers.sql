CREATE TYPE "public"."competition_format" AS ENUM('single_elimination');--> statement-breakpoint
CREATE TYPE "public"."competition_match_resolution_type" AS ENUM('played', 'bye');--> statement-breakpoint
CREATE TYPE "public"."competition_match_status" AS ENUM('pending', 'completed');--> statement-breakpoint
CREATE TYPE "public"."competition_status" AS ENUM('draft', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."match_format" AS ENUM('BO1', 'BO3', 'BO5');--> statement-breakpoint
CREATE TYPE "public"."profile_role" AS ENUM('player', 'organizer', 'admin');--> statement-breakpoint
CREATE TABLE "activity_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name_ru" varchar(120) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "activity_types_code_unique" UNIQUE("code"),
	CONSTRAINT "activity_types_code_not_empty" CHECK (char_length(trim("activity_types"."code")) > 0),
	CONSTRAINT "activity_types_name_ru_not_empty" CHECK (char_length(trim("activity_types"."name_ru")) > 0)
);
--> statement-breakpoint
CREATE TABLE "competition_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"match_number" integer NOT NULL,
	"slot1_participant_id" uuid,
	"slot2_participant_id" uuid,
	"slot1_score" integer,
	"slot2_score" integer,
	"winner_participant_id" uuid,
	"status" "competition_match_status" DEFAULT 'pending' NOT NULL,
	"resolution_type" "competition_match_resolution_type",
	"next_match_id" uuid,
	"next_match_slot" integer,
	"reported_by_profile_id" uuid,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "competition_matches_round_match_unique" UNIQUE("competition_id","round_number","match_number"),
	CONSTRAINT "competition_matches_round_positive" CHECK ("competition_matches"."round_number" > 0),
	CONSTRAINT "competition_matches_match_positive" CHECK ("competition_matches"."match_number" > 0),
	CONSTRAINT "competition_matches_slot1_score_non_negative" CHECK ("competition_matches"."slot1_score" is null or "competition_matches"."slot1_score" >= 0),
	CONSTRAINT "competition_matches_slot2_score_non_negative" CHECK ("competition_matches"."slot2_score" is null or "competition_matches"."slot2_score" >= 0),
	CONSTRAINT "competition_matches_next_match_slot_valid" CHECK ("competition_matches"."next_match_slot" is null or "competition_matches"."next_match_slot" in (1, 2)),
	CONSTRAINT "competition_matches_completed_requires_resolution" CHECK ("competition_matches"."status" <> 'completed' or "competition_matches"."resolution_type" is not null),
	CONSTRAINT "competition_matches_bye_shape" CHECK ("competition_matches"."resolution_type" <> 'bye' or (
        (
          "competition_matches"."slot1_participant_id" is not null and
          "competition_matches"."slot2_participant_id" is null and
          "competition_matches"."winner_participant_id" = "competition_matches"."slot1_participant_id"
        ) or (
          "competition_matches"."slot2_participant_id" is not null and
          "competition_matches"."slot1_participant_id" is null and
          "competition_matches"."winner_participant_id" = "competition_matches"."slot2_participant_id"
        )
      )),
	CONSTRAINT "competition_matches_played_shape" CHECK ("competition_matches"."resolution_type" <> 'played' or (
        "competition_matches"."slot1_participant_id" is not null and
        "competition_matches"."slot2_participant_id" is not null and
        "competition_matches"."winner_participant_id" in ("competition_matches"."slot1_participant_id", "competition_matches"."slot2_participant_id") and
        "competition_matches"."slot1_score" is not null and
        "competition_matches"."slot2_score" is not null
      ))
);
--> statement-breakpoint
CREATE TABLE "competition_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"added_by_profile_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "competition_participants_competition_participant_unique" UNIQUE("competition_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_type_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"format" "competition_format" DEFAULT 'single_elimination' NOT NULL,
	"match_format" "match_format" NOT NULL,
	"status" "competition_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp,
	"location" varchar(255),
	"created_by_profile_id" uuid NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "competitions_title_not_empty" CHECK (char_length(trim("competitions"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_type_id" uuid NOT NULL,
	"participant1_id" uuid NOT NULL,
	"participant2_id" uuid NOT NULL,
	"match_format" "match_format" NOT NULL,
	"participant1_score" integer NOT NULL,
	"participant2_score" integer NOT NULL,
	"winner_participant_id" uuid NOT NULL,
	"created_by_profile_id" uuid NOT NULL,
	"played_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "matches_participants_different" CHECK ("matches"."participant1_id" <> "matches"."participant2_id"),
	CONSTRAINT "matches_winner_is_participant" CHECK ("matches"."winner_participant_id" in ("matches"."participant1_id", "matches"."participant2_id")),
	CONSTRAINT "matches_participant1_score_non_negative" CHECK ("matches"."participant1_score" >= 0),
	CONSTRAINT "matches_participant2_score_non_negative" CHECK ("matches"."participant2_score" >= 0),
	CONSTRAINT "matches_score_matches_format" CHECK ((
        ("matches"."match_format" = 'BO1' and (
          ("matches"."participant1_score" = 1 and "matches"."participant2_score" = 0) or
          ("matches"."participant1_score" = 0 and "matches"."participant2_score" = 1)
        )) or
        ("matches"."match_format" = 'BO3' and (
          ("matches"."participant1_score" = 2 and "matches"."participant2_score" in (0, 1)) or
          ("matches"."participant2_score" = 2 and "matches"."participant1_score" in (0, 1))
        )) or
        ("matches"."match_format" = 'BO5' and (
          ("matches"."participant1_score" = 3 and "matches"."participant2_score" in (0, 1, 2)) or
          ("matches"."participant2_score" = 3 and "matches"."participant1_score" in (0, 1, 2))
        ))
      ))
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"activity_type_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "participants_profile_activity_unique" UNIQUE("profile_id","activity_type_id")
);
--> statement-breakpoint
CREATE TABLE "rankings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"rating" integer DEFAULT 1000 NOT NULL,
	"matches_played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rankings_participant_id_unique" UNIQUE("participant_id"),
	CONSTRAINT "rankings_matches_played_non_negative" CHECK ("rankings"."matches_played" >= 0),
	CONSTRAINT "rankings_wins_non_negative" CHECK ("rankings"."wins" >= 0),
	CONSTRAINT "rankings_losses_non_negative" CHECK ("rankings"."losses" >= 0)
);
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" SET DATA TYPE "public"."profile_role" USING "role"::"public"."profile_role";--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" SET DEFAULT 'player'::"public"."profile_role";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "auth_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "profiles" SET "auth_user_id" = gen_random_uuid()::text WHERE "auth_user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "auth_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_matches_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_matches_slot1_participant_id_participants_id_fk" FOREIGN KEY ("slot1_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_matches_slot2_participant_id_participants_id_fk" FOREIGN KEY ("slot2_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_matches_winner_participant_id_participants_id_fk" FOREIGN KEY ("winner_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_matches_next_match_id_competition_matches_id_fk" FOREIGN KEY ("next_match_id") REFERENCES "public"."competition_matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_matches_reported_by_profile_id_profiles_id_fk" FOREIGN KEY ("reported_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_added_by_profile_id_profiles_id_fk" FOREIGN KEY ("added_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_created_by_profile_id_profiles_id_fk" FOREIGN KEY ("created_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_participant1_id_participants_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_participant2_id_participants_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_participant_id_participants_id_fk" FOREIGN KEY ("winner_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_profile_id_profiles_id_fk" FOREIGN KEY ("created_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_auth_user_id_unique" UNIQUE("auth_user_id");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_email_not_empty" CHECK (char_length(trim("profiles"."email")) > 0);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_display_name_not_empty" CHECK (char_length(trim("profiles"."display_name")) > 0);
--> statement-breakpoint
INSERT INTO "activity_types" ("code", "name_ru", "is_active")
VALUES ('table_tennis', 'Настольный теннис', true)
ON CONFLICT ("code") DO NOTHING;
