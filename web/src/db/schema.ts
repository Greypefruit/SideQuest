import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

const authUserIdLength = 255;
const emailLength = 255;
const personNameLength = 120;
const displayNameLength = 120;
const otpCodeHashLength = 64;
const activityCodeLength = 64;
const activityNameLength = 120;
const competitionTitleLength = 255;
const locationLength = 255;

export const profileRoleValues = [
  "player",
  "organizer",
  "admin",
] as const;

export const matchFormatValues = ["BO1", "BO3", "BO5"] as const;

export const competitionFormatValues = [
  "single_elimination",
] as const;

export const competitionStatusValues = [
  "draft",
  "registration",
  "ready",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const competitionMatchStatusValues = [
  "pending",
  "completed",
] as const;

export const competitionMatchResolutionTypeValues = [
  "played",
  "bye",
] as const;

export const profiles = mysqlTable(
  "profiles",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    authUserId: varchar("auth_user_id", { length: authUserIdLength })
      .notNull()
      .unique(),
    email: varchar("email", { length: emailLength }).notNull().unique(),
    firstName: varchar("first_name", { length: personNameLength }),
    lastName: varchar("last_name", { length: personNameLength }),
    displayName: varchar("display_name", { length: displayNameLength }).notNull(),
    role: mysqlEnum("role", profileRoleValues).notNull().default("player"),
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

export const authOtpChallenges = mysqlTable(
  "auth_otp_challenges",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    email: varchar("email", { length: emailLength }).notNull(),
    codeHash: varchar("code_hash", { length: otpCodeHashLength }).notNull(),
    attemptsCount: int("attempts_count").notNull().default(0),
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

export const activityTypes = mysqlTable(
  "activity_types",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
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

export const participants = mysqlTable(
  "participants",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    profileId: varchar("profile_id", { length: 36 })
      .notNull()
      .references(() => profiles.id),
    activityTypeId: varchar("activity_type_id", { length: 36 })
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

export const rankings = mysqlTable(
  "rankings",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    participantId: varchar("participant_id", { length: 36 })
      .notNull()
      .references(() => participants.id)
      .unique(),
    rating: int("rating").notNull().default(1000),
    matchesPlayed: int("matches_played").notNull().default(0),
    wins: int("wins").notNull().default(0),
    losses: int("losses").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check("rankings_matches_played_non_negative", sql`${table.matchesPlayed} >= 0`),
    check("rankings_wins_non_negative", sql`${table.wins} >= 0`),
    check("rankings_losses_non_negative", sql`${table.losses} >= 0`),
  ],
);

export const matches = mysqlTable(
  "matches",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    activityTypeId: varchar("activity_type_id", { length: 36 })
      .notNull()
      .references(() => activityTypes.id),
    participant1Id: varchar("participant1_id", { length: 36 })
      .notNull()
      .references(() => participants.id),
    participant2Id: varchar("participant2_id", { length: 36 })
      .notNull()
      .references(() => participants.id),
    matchFormat: mysqlEnum("match_format", matchFormatValues).notNull(),
    participant1Score: int("participant1_score").notNull(),
    participant2Score: int("participant2_score").notNull(),
    winnerParticipantId: varchar("winner_participant_id", { length: 36 })
      .notNull()
      .references(() => participants.id),
    createdByProfileId: varchar("created_by_profile_id", { length: 36 })
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

export const competitions = mysqlTable(
  "competitions",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    activityTypeId: varchar("activity_type_id", { length: 36 })
      .notNull()
      .references(() => activityTypes.id),
    title: varchar("title", { length: competitionTitleLength }).notNull(),
    format: mysqlEnum("format", competitionFormatValues)
      .notNull()
      .default("single_elimination"),
    matchFormat: mysqlEnum("match_format", matchFormatValues).notNull(),
    status: mysqlEnum("status", competitionStatusValues).notNull().default("draft"),
    maxParticipants: int("max_participants").notNull().default(16),
    scheduledAt: timestamp("scheduled_at"),
    location: varchar("location", { length: locationLength }),
    createdByProfileId: varchar("created_by_profile_id", { length: 36 })
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

export const competitionParticipants = mysqlTable(
  "competition_participants",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    competitionId: varchar("competition_id", { length: 36 })
      .notNull()
      .references(() => competitions.id),
    participantId: varchar("participant_id", { length: 36 })
      .notNull()
      .references(() => participants.id),
    addedByProfileId: varchar("added_by_profile_id", { length: 36 })
      .notNull()
      .references(() => profiles.id),
    ratingAtSeeding: int("rating_at_seeding"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("competition_participants_competition_participant_unique").on(
      table.competitionId,
      table.participantId,
    ),
  ],
);

export const competitionMatches = mysqlTable(
  "competition_matches",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    competitionId: varchar("competition_id", { length: 36 })
      .notNull()
      .references(() => competitions.id),
    roundNumber: int("round_number").notNull(),
    matchNumber: int("match_number").notNull(),
    slot1ParticipantId: varchar("slot1_participant_id", { length: 36 }).references(
      () => participants.id,
    ),
    slot2ParticipantId: varchar("slot2_participant_id", { length: 36 }).references(
      () => participants.id,
    ),
    slot1Score: int("slot1_score"),
    slot2Score: int("slot2_score"),
    winnerParticipantId: varchar("winner_participant_id", { length: 36 }).references(
      () => participants.id,
    ),
    status: mysqlEnum("status", competitionMatchStatusValues).notNull().default("pending"),
    resolutionType: mysqlEnum("resolution_type", competitionMatchResolutionTypeValues),
    nextMatchId: varchar("next_match_id", { length: 36 }),
    nextMatchSlot: int("next_match_slot"),
    reportedByProfileId: varchar("reported_by_profile_id", { length: 36 }).references(
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
