import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const authUserIdLength = 255;
const emailLength = 255;
const personNameLength = 120;
const displayNameLength = 120;
const otpCodeHashLength = 64;
const activityCodeLength = 64;
const activityNameLength = 120;
const competitionTitleLength = 255;
const locationLength = 255;

export const profileRoleEnum = pgEnum("profile_role", [
  "player",
  "organizer",
  "admin",
]);

export const matchFormatEnum = pgEnum("match_format", ["BO1", "BO3", "BO5"]);

export const competitionFormatEnum = pgEnum("competition_format", [
  "single_elimination",
]);

export const competitionStatusEnum = pgEnum("competition_status", [
  "draft",
  "registration",
  "ready",
  "in_progress",
  "completed",
  "cancelled",
]);

export const competitionMatchStatusEnum = pgEnum("competition_match_status", [
  "pending",
  "completed",
]);

export const competitionMatchResolutionTypeEnum = pgEnum(
  "competition_match_resolution_type",
  ["played", "bye"],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authUserId: varchar("auth_user_id", { length: authUserIdLength })
      .notNull()
      .unique(),
    email: varchar("email", { length: emailLength }).notNull().unique(),
    firstName: varchar("first_name", { length: personNameLength }),
    lastName: varchar("last_name", { length: personNameLength }),
    displayName: varchar("display_name", { length: displayNameLength }).notNull(),
    role: profileRoleEnum("role").notNull().default("player"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check("profiles_email_not_empty", sql`char_length(trim(${table.email})) > 0`),
    check(
      "profiles_first_name_not_empty",
      sql`${table.firstName} is null or char_length(trim(${table.firstName})) > 0`,
    ),
    check(
      "profiles_last_name_not_empty",
      sql`${table.lastName} is null or char_length(trim(${table.lastName})) > 0`,
    ),
    check(
      "profiles_display_name_not_empty",
      sql`char_length(trim(${table.displayName})) > 0`,
    ),
  ],
);

export const authOtpChallenges = pgTable(
  "auth_otp_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: emailLength }).notNull(),
    codeHash: varchar("code_hash", { length: otpCodeHashLength }).notNull(),
    attemptsCount: integer("attempts_count").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    resendAvailableAt: timestamp("resend_available_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    invalidatedAt: timestamp("invalidated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "auth_otp_challenges_email_not_empty",
      sql`char_length(trim(${table.email})) > 0`,
    ),
    check(
      "auth_otp_challenges_attempts_count_valid",
      sql`${table.attemptsCount} >= 0 and ${table.attemptsCount} <= 5`,
    ),
  ],
);

export const activityTypes = pgTable(
  "activity_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: activityCodeLength }).notNull().unique(),
    nameRu: varchar("name_ru", { length: activityNameLength }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "activity_types_code_not_empty",
      sql`char_length(trim(${table.code})) > 0`,
    ),
    check(
      "activity_types_name_ru_not_empty",
      sql`char_length(trim(${table.nameRu})) > 0`,
    ),
  ],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id),
    activityTypeId: uuid("activity_type_id")
      .notNull()
      .references(() => activityTypes.id),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("participants_profile_activity_unique").on(
      table.profileId,
      table.activityTypeId,
    ),
  ],
);

export const rankings = pgTable(
  "rankings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id)
      .unique(),
    rating: integer("rating").notNull().default(1000),
    matchesPlayed: integer("matches_played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check("rankings_matches_played_non_negative", sql`${table.matchesPlayed} >= 0`),
    check("rankings_wins_non_negative", sql`${table.wins} >= 0`),
    check("rankings_losses_non_negative", sql`${table.losses} >= 0`),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityTypeId: uuid("activity_type_id")
      .notNull()
      .references(() => activityTypes.id),
    participant1Id: uuid("participant1_id")
      .notNull()
      .references(() => participants.id),
    participant2Id: uuid("participant2_id")
      .notNull()
      .references(() => participants.id),
    matchFormat: matchFormatEnum("match_format").notNull(),
    participant1Score: integer("participant1_score").notNull(),
    participant2Score: integer("participant2_score").notNull(),
    winnerParticipantId: uuid("winner_participant_id")
      .notNull()
      .references(() => participants.id),
    createdByProfileId: uuid("created_by_profile_id")
      .notNull()
      .references(() => profiles.id),
    playedAt: timestamp("played_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "matches_participants_different",
      sql`${table.participant1Id} <> ${table.participant2Id}`,
    ),
    check(
      "matches_winner_is_participant",
      sql`${table.winnerParticipantId} in (${table.participant1Id}, ${table.participant2Id})`,
    ),
    check(
      "matches_participant1_score_non_negative",
      sql`${table.participant1Score} >= 0`,
    ),
    check(
      "matches_participant2_score_non_negative",
      sql`${table.participant2Score} >= 0`,
    ),
    check(
      "matches_score_matches_format",
      sql`(
        (${table.matchFormat} = 'BO1' and (
          (${table.participant1Score} = 1 and ${table.participant2Score} = 0) or
          (${table.participant1Score} = 0 and ${table.participant2Score} = 1)
        )) or
        (${table.matchFormat} = 'BO3' and (
          (${table.participant1Score} = 2 and ${table.participant2Score} in (0, 1)) or
          (${table.participant2Score} = 2 and ${table.participant1Score} in (0, 1))
        )) or
        (${table.matchFormat} = 'BO5' and (
          (${table.participant1Score} = 3 and ${table.participant2Score} in (0, 1, 2)) or
          (${table.participant2Score} = 3 and ${table.participant1Score} in (0, 1, 2))
        ))
      )`,
    ),
  ],
);

export const competitions = pgTable(
  "competitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityTypeId: uuid("activity_type_id")
      .notNull()
      .references(() => activityTypes.id),
    title: varchar("title", { length: competitionTitleLength }).notNull(),
    format: competitionFormatEnum("format")
      .notNull()
      .default("single_elimination"),
    matchFormat: matchFormatEnum("match_format").notNull(),
    status: competitionStatusEnum("status").notNull().default("draft"),
    maxParticipants: integer("max_participants").notNull().default(16),
    scheduledAt: timestamp("scheduled_at"),
    location: varchar("location", { length: locationLength }),
    createdByProfileId: uuid("created_by_profile_id")
      .notNull()
      .references(() => profiles.id),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "competitions_title_not_empty",
      sql`char_length(trim(${table.title})) > 0`,
    ),
    check(
      "competitions_max_participants_positive",
      sql`${table.maxParticipants} >= 2`,
    ),
  ],
);

export const competitionParticipants = pgTable(
  "competition_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id),
    addedByProfileId: uuid("added_by_profile_id")
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("competition_participants_competition_participant_unique").on(
      table.competitionId,
      table.participantId,
    ),
  ],
);

export const competitionMatches = pgTable(
  "competition_matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id),
    roundNumber: integer("round_number").notNull(),
    matchNumber: integer("match_number").notNull(),
    slot1ParticipantId: uuid("slot1_participant_id").references(
      () => participants.id,
    ),
    slot2ParticipantId: uuid("slot2_participant_id").references(
      () => participants.id,
    ),
    slot1Score: integer("slot1_score"),
    slot2Score: integer("slot2_score"),
    winnerParticipantId: uuid("winner_participant_id").references(
      () => participants.id,
    ),
    status: competitionMatchStatusEnum("status").notNull().default("pending"),
    resolutionType: competitionMatchResolutionTypeEnum("resolution_type"),
    nextMatchId: uuid("next_match_id"),
    nextMatchSlot: integer("next_match_slot"),
    reportedByProfileId: uuid("reported_by_profile_id").references(
      () => profiles.id,
    ),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("competition_matches_round_match_unique").on(
      table.competitionId,
      table.roundNumber,
      table.matchNumber,
    ),
    foreignKey({
      columns: [table.nextMatchId],
      foreignColumns: [table.id],
      name: "competition_matches_next_match_id_competition_matches_id_fk",
    }),
    check("competition_matches_round_positive", sql`${table.roundNumber} > 0`),
    check("competition_matches_match_positive", sql`${table.matchNumber} > 0`),
    check(
      "competition_matches_slot1_score_non_negative",
      sql`${table.slot1Score} is null or ${table.slot1Score} >= 0`,
    ),
    check(
      "competition_matches_slot2_score_non_negative",
      sql`${table.slot2Score} is null or ${table.slot2Score} >= 0`,
    ),
    check(
      "competition_matches_next_match_slot_valid",
      sql`${table.nextMatchSlot} is null or ${table.nextMatchSlot} in (1, 2)`,
    ),
    check(
      "competition_matches_completed_requires_resolution",
      sql`${table.status} <> 'completed' or ${table.resolutionType} is not null`,
    ),
    check(
      "competition_matches_bye_shape",
      sql`${table.resolutionType} <> 'bye' or (
        (
          ${table.slot1ParticipantId} is not null and
          ${table.slot2ParticipantId} is null and
          ${table.winnerParticipantId} = ${table.slot1ParticipantId}
        ) or (
          ${table.slot2ParticipantId} is not null and
          ${table.slot1ParticipantId} is null and
          ${table.winnerParticipantId} = ${table.slot2ParticipantId}
        )
      )`,
    ),
    check(
      "competition_matches_played_shape",
      sql`${table.resolutionType} <> 'played' or (
        ${table.slot1ParticipantId} is not null and
        ${table.slot2ParticipantId} is not null and
        ${table.winnerParticipantId} in (${table.slot1ParticipantId}, ${table.slot2ParticipantId}) and
        ${table.slot1Score} is not null and
        ${table.slot2Score} is not null
      )`,
    ),
  ],
);
