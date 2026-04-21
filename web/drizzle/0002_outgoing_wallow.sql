CREATE TABLE "auth_otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"resend_available_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"invalidated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_otp_challenges_email_not_empty" CHECK (char_length(trim("auth_otp_challenges"."email")) > 0),
	CONSTRAINT "auth_otp_challenges_attempts_count_valid" CHECK ("auth_otp_challenges"."attempts_count" >= 0 and "auth_otp_challenges"."attempts_count" <= 5)
);
