import "server-only";
import { and, desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type DbExecutor } from "../index";
import { activityTypes, matches, participants, profiles } from "../schema";
import { activityTypeColumns, getDb } from "./shared";

const participant1 = alias(participants, "match_participant1");
const participant2 = alias(participants, "match_participant2");
const winnerParticipant = alias(participants, "match_winner_participant");
const participant1Profile = alias(profiles, "match_participant1_profile");
const participant2Profile = alias(profiles, "match_participant2_profile");
const winnerProfile = alias(profiles, "match_winner_profile");
const creatorProfile = alias(profiles, "match_creator_profile");

type CreateMatchInput = Pick<
  typeof matches.$inferInsert,
  | "activityTypeId"
  | "participant1Id"
  | "participant2Id"
  | "matchFormat"
  | "participant1Score"
  | "participant2Score"
  | "winnerParticipantId"
  | "createdByProfileId"
  | "playedAt"
>;

function buildMatchDetailsQuery(database?: DbExecutor) {
  return getDb(database)
    .select({
      match: {
        id: matches.id,
        activityTypeId: matches.activityTypeId,
        participant1Id: matches.participant1Id,
        participant2Id: matches.participant2Id,
        matchFormat: matches.matchFormat,
        participant1Score: matches.participant1Score,
        participant2Score: matches.participant2Score,
        winnerParticipantId: matches.winnerParticipantId,
        createdByProfileId: matches.createdByProfileId,
        playedAt: matches.playedAt,
        createdAt: matches.createdAt,
      },
      activityType: activityTypeColumns,
      participant1: {
        id: participant1.id,
        profileId: participant1.profileId,
        activityTypeId: participant1.activityTypeId,
        isActive: participant1.isActive,
        createdAt: participant1.createdAt,
        updatedAt: participant1.updatedAt,
      },
      participant1Profile: {
        id: participant1Profile.id,
        email: participant1Profile.email,
        displayName: participant1Profile.displayName,
        role: participant1Profile.role,
        isActive: participant1Profile.isActive,
      },
      participant2: {
        id: participant2.id,
        profileId: participant2.profileId,
        activityTypeId: participant2.activityTypeId,
        isActive: participant2.isActive,
        createdAt: participant2.createdAt,
        updatedAt: participant2.updatedAt,
      },
      participant2Profile: {
        id: participant2Profile.id,
        email: participant2Profile.email,
        displayName: participant2Profile.displayName,
        role: participant2Profile.role,
        isActive: participant2Profile.isActive,
      },
      winnerParticipant: {
        id: winnerParticipant.id,
        profileId: winnerParticipant.profileId,
        activityTypeId: winnerParticipant.activityTypeId,
        isActive: winnerParticipant.isActive,
        createdAt: winnerParticipant.createdAt,
        updatedAt: winnerParticipant.updatedAt,
      },
      winnerProfile: {
        id: winnerProfile.id,
        email: winnerProfile.email,
        displayName: winnerProfile.displayName,
        role: winnerProfile.role,
        isActive: winnerProfile.isActive,
      },
      createdByProfile: {
        id: creatorProfile.id,
        authUserId: creatorProfile.authUserId,
        email: creatorProfile.email,
        displayName: creatorProfile.displayName,
        role: creatorProfile.role,
        isActive: creatorProfile.isActive,
        createdAt: creatorProfile.createdAt,
        updatedAt: creatorProfile.updatedAt,
      },
    })
    .from(matches)
    .innerJoin(activityTypes, eq(matches.activityTypeId, activityTypes.id))
    .innerJoin(participant1, eq(matches.participant1Id, participant1.id))
    .innerJoin(participant2, eq(matches.participant2Id, participant2.id))
    .innerJoin(winnerParticipant, eq(matches.winnerParticipantId, winnerParticipant.id))
    .innerJoin(participant1Profile, eq(participant1.profileId, participant1Profile.id))
    .innerJoin(participant2Profile, eq(participant2.profileId, participant2Profile.id))
    .innerJoin(winnerProfile, eq(winnerParticipant.profileId, winnerProfile.id))
    .innerJoin(creatorProfile, eq(matches.createdByProfileId, creatorProfile.id));
}

export async function listMatchesByActivity(
  activityTypeId: string,
  options?: { limit?: number },
  database?: DbExecutor,
) {
  const query = buildMatchDetailsQuery(database)
    .where(eq(matches.activityTypeId, activityTypeId))
    .orderBy(desc(matches.playedAt), desc(matches.createdAt));

  if (options?.limit !== undefined) {
    return query.limit(options.limit);
  }

  return query;
}

export async function listRecentMatchesByActivity(
  activityTypeId: string,
  limit = 5,
  database?: DbExecutor,
) {
  return listMatchesByActivity(activityTypeId, { limit }, database);
}

export async function getMatchById(matchId: string, database?: DbExecutor) {
  const [match] = await buildMatchDetailsQuery(database)
    .where(eq(matches.id, matchId))
    .limit(1);

  return match ?? null;
}

export async function createMatch(
  input: CreateMatchInput,
  database?: DbExecutor,
) {
  const [match] = await getDb(database)
    .insert(matches)
    .values(input)
    .returning();

  return match;
}

export async function listParticipantMatches(
  participantId: string,
  activityTypeId: string,
  options?: { limit?: number },
  database?: DbExecutor,
) {
  const query = buildMatchDetailsQuery(database)
    .where(
      and(
        eq(matches.activityTypeId, activityTypeId),
        or(
          eq(matches.participant1Id, participantId),
          eq(matches.participant2Id, participantId),
        ),
      ),
    )
    .orderBy(desc(matches.playedAt), desc(matches.createdAt));

  if (options?.limit !== undefined) {
    return query.limit(options.limit);
  }

  return query;
}

export async function listProfileMatches(
  profileId: string,
  activityTypeId: string,
  options?: { limit?: number },
  database?: DbExecutor,
) {
  const query = buildMatchDetailsQuery(database)
    .where(
      and(
        eq(matches.activityTypeId, activityTypeId),
        or(eq(participant1.profileId, profileId), eq(participant2.profileId, profileId)),
      ),
    )
    .orderBy(desc(matches.playedAt), desc(matches.createdAt));

  if (options?.limit !== undefined) {
    return query.limit(options.limit);
  }

  return query;
}
