import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { type DbExecutor } from "../index";
import { activityTypes, participants, profiles, rankings } from "../schema";
import {
  activityTypeColumns,
  getDb,
  participantColumns,
  profileColumns,
  rankingColumns,
  rankingOrder,
} from "./shared";

type CreateRankingInput = Pick<typeof rankings.$inferInsert, "participantId"> &
  Partial<
    Pick<
      typeof rankings.$inferInsert,
      "rating" | "matchesPlayed" | "wins" | "losses"
    >
  >;

export async function getRankingByParticipantId(
  participantId: string,
  database?: DbExecutor,
) {
  const [ranking] = await getDb(database)
    .select()
    .from(rankings)
    .where(eq(rankings.participantId, participantId))
    .limit(1);

  return ranking ?? null;
}

export async function createRanking(
  input: CreateRankingInput,
  database?: DbExecutor,
) {
  const [ranking] = await getDb(database)
    .insert(rankings)
    .values(input)
    .returning();

  return ranking;
}

export async function ensureRankingExists(
  input: CreateRankingInput,
  database?: DbExecutor,
) {
  const connection = getDb(database);

  const [createdRanking] = await connection
    .insert(rankings)
    .values(input)
    .onConflictDoNothing({ target: rankings.participantId })
    .returning();

  if (createdRanking) {
    return createdRanking;
  }

  return getRankingByParticipantId(input.participantId, connection);
}

export async function getProfileRanking(
  profileId: string,
  activityTypeId: string,
  database?: DbExecutor,
) {
  const [result] = await getDb(database)
    .select({
      ranking: rankingColumns,
      participant: participantColumns,
      profile: profileColumns,
      activityType: activityTypeColumns,
    })
    .from(rankings)
    .innerJoin(participants, eq(rankings.participantId, participants.id))
    .innerJoin(profiles, eq(participants.profileId, profiles.id))
    .innerJoin(activityTypes, eq(participants.activityTypeId, activityTypes.id))
    .where(
      and(
        eq(participants.profileId, profileId),
        eq(participants.activityTypeId, activityTypeId),
      ),
    )
    .limit(1);

  return result ?? null;
}

export async function listActivityRanking(
  activityTypeId: string,
  database?: DbExecutor,
) {
  return getDb(database)
    .select({
      ranking: rankingColumns,
      participant: participantColumns,
      profile: profileColumns,
      activityType: activityTypeColumns,
    })
    .from(rankings)
    .innerJoin(participants, eq(rankings.participantId, participants.id))
    .innerJoin(profiles, eq(participants.profileId, profiles.id))
    .innerJoin(activityTypes, eq(participants.activityTypeId, activityTypes.id))
    .where(eq(participants.activityTypeId, activityTypeId))
    .orderBy(...rankingOrder, asc(participants.id));
}

export async function countActivityRankingEntries(
  activityTypeId: string,
  database?: DbExecutor,
) {
  const [result] = await getDb(database)
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(rankings)
    .innerJoin(participants, eq(rankings.participantId, participants.id))
    .where(eq(participants.activityTypeId, activityTypeId));

  return result?.count ?? 0;
}

type ListActivityRankingPageOptions = {
  limit: number;
  offset: number;
};

export async function listActivityRankingPage(
  activityTypeId: string,
  options: ListActivityRankingPageOptions,
  database?: DbExecutor,
) {
  return getDb(database)
    .select({
      ranking: rankingColumns,
      participant: participantColumns,
      profile: profileColumns,
      activityType: activityTypeColumns,
    })
    .from(rankings)
    .innerJoin(participants, eq(rankings.participantId, participants.id))
    .innerJoin(profiles, eq(participants.profileId, profiles.id))
    .innerJoin(activityTypes, eq(participants.activityTypeId, activityTypes.id))
    .where(eq(participants.activityTypeId, activityTypeId))
    .orderBy(...rankingOrder, asc(participants.id))
    .limit(options.limit)
    .offset(options.offset);
}

export async function getActivityRankingViewerPosition(
  activityTypeId: string,
  profileId: string,
  database?: DbExecutor,
) {
  const connection = getDb(database);
  const rankedEntries = connection
    .select({
      profileId: profiles.id,
      position:
        sql<number>`row_number() over (order by ${rankings.rating} desc, ${rankings.matchesPlayed} desc, ${rankings.wins} desc, ${rankings.losses} asc, ${profiles.displayName} asc, ${profiles.email} asc)`.as(
          "position",
        ),
    })
    .from(rankings)
    .innerJoin(participants, eq(rankings.participantId, participants.id))
    .innerJoin(profiles, eq(participants.profileId, profiles.id))
    .where(eq(participants.activityTypeId, activityTypeId))
    .as("ranked_entries");

  const [result] = await connection
    .select({
      position: rankedEntries.position,
    })
    .from(rankedEntries)
    .where(eq(rankedEntries.profileId, profileId))
    .limit(1);

  return result?.position ?? null;
}
