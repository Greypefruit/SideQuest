CREATE TABLE `activity_types` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name_ru` varchar(120) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_types_code_unique` UNIQUE(`code`),
	CONSTRAINT `activity_types_code_not_empty` CHECK(char_length(trim(`activity_types`.`code`)) > 0),
	CONSTRAINT `activity_types_name_ru_not_empty` CHECK(char_length(trim(`activity_types`.`name_ru`)) > 0)
);
--> statement-breakpoint
CREATE TABLE `auth_otp_challenges` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`attempts_count` int NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	`resend_available_at` timestamp NOT NULL,
	`consumed_at` timestamp,
	`invalidated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_otp_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_otp_challenges_email_not_empty` CHECK(char_length(trim(`auth_otp_challenges`.`email`)) > 0),
	CONSTRAINT `auth_otp_challenges_attempts_count_valid` CHECK(`auth_otp_challenges`.`attempts_count` >= 0 and `auth_otp_challenges`.`attempts_count` <= 5)
);
--> statement-breakpoint
CREATE TABLE `competition_matches` (
	`id` varchar(36) NOT NULL,
	`competition_id` varchar(36) NOT NULL,
	`round_number` int NOT NULL,
	`match_number` int NOT NULL,
	`slot1_participant_id` varchar(36),
	`slot2_participant_id` varchar(36),
	`slot1_score` int,
	`slot2_score` int,
	`winner_participant_id` varchar(36),
	`status` enum('pending','completed') NOT NULL DEFAULT 'pending',
	`resolution_type` enum('played','bye'),
	`next_match_id` varchar(36),
	`next_match_slot` int,
	`reported_by_profile_id` varchar(36),
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competition_matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_matches_round_match_unique` UNIQUE(`competition_id`,`round_number`,`match_number`),
	CONSTRAINT `competition_matches_round_positive` CHECK(`competition_matches`.`round_number` > 0),
	CONSTRAINT `competition_matches_match_positive` CHECK(`competition_matches`.`match_number` > 0),
	CONSTRAINT `competition_matches_slot1_score_non_negative` CHECK(`competition_matches`.`slot1_score` is null or `competition_matches`.`slot1_score` >= 0),
	CONSTRAINT `competition_matches_slot2_score_non_negative` CHECK(`competition_matches`.`slot2_score` is null or `competition_matches`.`slot2_score` >= 0),
	CONSTRAINT `competition_matches_next_match_slot_valid` CHECK(`competition_matches`.`next_match_slot` is null or `competition_matches`.`next_match_slot` in (1, 2)),
	CONSTRAINT `competition_matches_completed_requires_resolution` CHECK(`competition_matches`.`status` <> 'completed' or `competition_matches`.`resolution_type` is not null),
	CONSTRAINT `competition_matches_bye_shape` CHECK(`competition_matches`.`resolution_type` <> 'bye' or (
        (
          `competition_matches`.`slot1_participant_id` is not null and
          `competition_matches`.`slot2_participant_id` is null and
          `competition_matches`.`winner_participant_id` = `competition_matches`.`slot1_participant_id`
        ) or (
          `competition_matches`.`slot2_participant_id` is not null and
          `competition_matches`.`slot1_participant_id` is null and
          `competition_matches`.`winner_participant_id` = `competition_matches`.`slot2_participant_id`
        )
      )),
	CONSTRAINT `competition_matches_played_shape` CHECK(`competition_matches`.`resolution_type` <> 'played' or (
        `competition_matches`.`slot1_participant_id` is not null and
        `competition_matches`.`slot2_participant_id` is not null and
        `competition_matches`.`winner_participant_id` in (`competition_matches`.`slot1_participant_id`, `competition_matches`.`slot2_participant_id`) and
        `competition_matches`.`slot1_score` is not null and
        `competition_matches`.`slot2_score` is not null
      ))
);
--> statement-breakpoint
CREATE TABLE `competition_participants` (
	`id` varchar(36) NOT NULL,
	`competition_id` varchar(36) NOT NULL,
	`participant_id` varchar(36) NOT NULL,
	`added_by_profile_id` varchar(36) NOT NULL,
	`rating_at_seeding` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competition_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_participants_competition_participant_unique` UNIQUE(`competition_id`,`participant_id`)
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` varchar(36) NOT NULL,
	`activity_type_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`format` enum('single_elimination') NOT NULL DEFAULT 'single_elimination',
	`match_format` enum('BO1','BO3','BO5') NOT NULL,
	`status` enum('draft','registration','ready','in_progress','completed','cancelled') NOT NULL DEFAULT 'draft',
	`max_participants` int NOT NULL DEFAULT 16,
	`scheduled_at` timestamp,
	`location` varchar(255),
	`created_by_profile_id` varchar(36) NOT NULL,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `competitions_title_not_empty` CHECK(char_length(trim(`competitions`.`title`)) > 0),
	CONSTRAINT `competitions_max_participants_positive` CHECK(`competitions`.`max_participants` >= 2)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` varchar(36) NOT NULL,
	`activity_type_id` varchar(36) NOT NULL,
	`participant1_id` varchar(36) NOT NULL,
	`participant2_id` varchar(36) NOT NULL,
	`match_format` enum('BO1','BO3','BO5') NOT NULL,
	`participant1_score` int NOT NULL,
	`participant2_score` int NOT NULL,
	`winner_participant_id` varchar(36) NOT NULL,
	`created_by_profile_id` varchar(36) NOT NULL,
	`played_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `matches_participants_different` CHECK(`matches`.`participant1_id` <> `matches`.`participant2_id`),
	CONSTRAINT `matches_winner_is_participant` CHECK(`matches`.`winner_participant_id` in (`matches`.`participant1_id`, `matches`.`participant2_id`)),
	CONSTRAINT `matches_participant1_score_non_negative` CHECK(`matches`.`participant1_score` >= 0),
	CONSTRAINT `matches_participant2_score_non_negative` CHECK(`matches`.`participant2_score` >= 0),
	CONSTRAINT `matches_score_matches_format` CHECK((
        (`matches`.`match_format` = 'BO1' and (
          (`matches`.`participant1_score` = 1 and `matches`.`participant2_score` = 0) or
          (`matches`.`participant1_score` = 0 and `matches`.`participant2_score` = 1)
        )) or
        (`matches`.`match_format` = 'BO3' and (
          (`matches`.`participant1_score` = 2 and `matches`.`participant2_score` in (0, 1)) or
          (`matches`.`participant2_score` = 2 and `matches`.`participant1_score` in (0, 1))
        )) or
        (`matches`.`match_format` = 'BO5' and (
          (`matches`.`participant1_score` = 3 and `matches`.`participant2_score` in (0, 1, 2)) or
          (`matches`.`participant2_score` = 3 and `matches`.`participant1_score` in (0, 1, 2))
        ))
      ))
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` varchar(36) NOT NULL,
	`profile_id` varchar(36) NOT NULL,
	`activity_type_id` varchar(36) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `participants_profile_activity_unique` UNIQUE(`profile_id`,`activity_type_id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` varchar(36) NOT NULL,
	`auth_user_id` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`first_name` varchar(120),
	`last_name` varchar(120),
	`display_name` varchar(120) NOT NULL,
	`role` enum('player','organizer','admin') NOT NULL DEFAULT 'player',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_auth_user_id_unique` UNIQUE(`auth_user_id`),
	CONSTRAINT `profiles_email_unique` UNIQUE(`email`),
	CONSTRAINT `profiles_email_not_empty` CHECK(char_length(trim(`profiles`.`email`)) > 0),
	CONSTRAINT `profiles_first_name_not_empty` CHECK(`profiles`.`first_name` is null or char_length(trim(`profiles`.`first_name`)) > 0),
	CONSTRAINT `profiles_last_name_not_empty` CHECK(`profiles`.`last_name` is null or char_length(trim(`profiles`.`last_name`)) > 0),
	CONSTRAINT `profiles_display_name_not_empty` CHECK(char_length(trim(`profiles`.`display_name`)) > 0)
);
--> statement-breakpoint
CREATE TABLE `rankings` (
	`id` varchar(36) NOT NULL,
	`participant_id` varchar(36) NOT NULL,
	`rating` int NOT NULL DEFAULT 1000,
	`matches_played` int NOT NULL DEFAULT 0,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rankings_id` PRIMARY KEY(`id`),
	CONSTRAINT `rankings_participant_id_unique` UNIQUE(`participant_id`),
	CONSTRAINT `rankings_matches_played_non_negative` CHECK(`rankings`.`matches_played` >= 0),
	CONSTRAINT `rankings_wins_non_negative` CHECK(`rankings`.`wins` >= 0),
	CONSTRAINT `rankings_losses_non_negative` CHECK(`rankings`.`losses` >= 0)
);
--> statement-breakpoint
ALTER TABLE `competition_matches` ADD CONSTRAINT `competition_matches_competition_id_competitions_id_fk` FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_matches` ADD CONSTRAINT `competition_matches_slot1_participant_id_participants_id_fk` FOREIGN KEY (`slot1_participant_id`) REFERENCES `participants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_matches` ADD CONSTRAINT `competition_matches_slot2_participant_id_participants_id_fk` FOREIGN KEY (`slot2_participant_id`) REFERENCES `participants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_matches` ADD CONSTRAINT `competition_matches_winner_participant_id_participants_id_fk` FOREIGN KEY (`winner_participant_id`) REFERENCES `participants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_matches` ADD CONSTRAINT `competition_matches_reported_by_profile_id_profiles_id_fk` FOREIGN KEY (`reported_by_profile_id`) REFERENCES `profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_matches` ADD CONSTRAINT `competition_matches_next_match_id_competition_matches_id_fk` FOREIGN KEY (`next_match_id`) REFERENCES `competition_matches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_participants` ADD CONSTRAINT `competition_participants_competition_id_competitions_id_fk` FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_participants` ADD CONSTRAINT `competition_participants_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_participants` ADD CONSTRAINT `competition_participants_added_by_profile_id_profiles_id_fk` FOREIGN KEY (`added_by_profile_id`) REFERENCES `profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competitions` ADD CONSTRAINT `competitions_activity_type_id_activity_types_id_fk` FOREIGN KEY (`activity_type_id`) REFERENCES `activity_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competitions` ADD CONSTRAINT `competitions_created_by_profile_id_profiles_id_fk` FOREIGN KEY (`created_by_profile_id`) REFERENCES `profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_activity_type_id_activity_types_id_fk` FOREIGN KEY (`activity_type_id`) REFERENCES `activity_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_participant1_id_participants_id_fk` FOREIGN KEY (`participant1_id`) REFERENCES `participants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_participant2_id_participants_id_fk` FOREIGN KEY (`participant2_id`) REFERENCES `participants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_winner_participant_id_participants_id_fk` FOREIGN KEY (`winner_participant_id`) REFERENCES `participants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_created_by_profile_id_profiles_id_fk` FOREIGN KEY (`created_by_profile_id`) REFERENCES `profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participants` ADD CONSTRAINT `participants_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participants` ADD CONSTRAINT `participants_activity_type_id_activity_types_id_fk` FOREIGN KEY (`activity_type_id`) REFERENCES `activity_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rankings` ADD CONSTRAINT `rankings_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE no action ON UPDATE no action;