import "server-only";
import { and, asc, eq } from "drizzle-orm";
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
