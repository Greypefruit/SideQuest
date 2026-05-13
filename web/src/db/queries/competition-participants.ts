import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { type DbExecutor } from "../index";
import {
  activityTypes,
  competitionParticipants,
  participants,
  profiles,
  rankings,
} from "../schema";
import {
  activityParticipantOrder,
  activityTypeColumns,
  getDb,
  participantColumns,
  profileColumns,
  rankingColumns,
} from "./shared";

type AddCompetitionParticipantInput = Pick<
  typeof competitionParticipants.$inferInsert,
  "competitionId" | "participantId" | "addedByProfileId"
>;

export async function getCompetitionParticipants(
  competitionId: string,
  database?: DbExecutor,
) {
  return getDb(database)
    .select({
      competitionParticipant: {
        id: competitionParticipants.id,
        competitionId: competitionParticipants.competitionId,
        participantId: competitionParticipants.participantId,
        addedByProfileId: competitionParticipants.addedByProfileId,
        ratingAtSeeding: competitionParticipants.ratingAtSeeding,
        createdAt: competitionParticipants.createdAt,
      },
      participant: participantColumns,
      profile: profileColumns,
      ranking: rankingColumns,
      activityType: activityTypeColumns,
    })
    .from(competitionParticipants)
    .innerJoin(participants, eq(competitionParticipants.participantId, participants.id))
    .innerJoin(profiles, eq(participants.profileId, profiles.id))
    .innerJoin(activityTypes, eq(participants.activityTypeId, activityTypes.id))
    .leftJoin(rankings, eq(rankings.participantId, participants.id))
    .where(eq(competitionParticipants.competitionId, competitionId))
    .orderBy(...activityParticipantOrder, asc(competitionParticipants.createdAt));
}

export async function addCompetitionParticipant(
  input: AddCompetitionParticipantInput,
  database?: DbExecutor,
) {
  const [competitionParticipant] = await getDb(database)
    .insert(competitionParticipants)
    .values(input)
    .returning();

  return competitionParticipant;
}

export async function removeCompetitionParticipant(
  competitionId: string,
  participantId: string,
  database?: DbExecutor,
) {
  const [competitionParticipant] = await getDb(database)
    .delete(competitionParticipants)
    .where(
      and(
        eq(competitionParticipants.competitionId, competitionId),
        eq(competitionParticipants.participantId, participantId),
      ),
    )
    .returning();

  return competitionParticipant ?? null;
}

export async function isParticipantInCompetition(
  competitionId: string,
  participantId: string,
  database?: DbExecutor,
) {
  const [competitionParticipant] = await getDb(database)
    .select({ id: competitionParticipants.id })
    .from(competitionParticipants)
    .where(
      and(
        eq(competitionParticipants.competitionId, competitionId),
        eq(competitionParticipants.participantId, participantId),
      ),
    )
    .limit(1);

  return Boolean(competitionParticipant);
}
