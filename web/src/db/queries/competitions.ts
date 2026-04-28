import "server-only";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { type DbExecutor } from "../index";
import {
  activityTypes,
  competitionMatches,
  competitionParticipants,
  competitions,
  participants,
  profiles,
} from "../schema";
import { activityTypeColumns, getDb, profileColumns } from "./shared";

type CreateCompetitionInput = Pick<
  typeof competitions.$inferInsert,
  | "activityTypeId"
  | "title"
  | "matchFormat"
  | "createdByProfileId"
  | "format"
  | "status"
  | "scheduledAt"
  | "location"
  | "startedAt"
  | "completedAt"
>;

type CompetitionStatus = typeof competitions.$inferSelect.status;

function buildCompetitionSummaryQuery(database?: DbExecutor) {
  return getDb(database)
    .select({
      competition: {
        id: competitions.id,
        activityTypeId: competitions.activityTypeId,
        title: competitions.title,
        format: competitions.format,
        matchFormat: competitions.matchFormat,
        status: competitions.status,
        scheduledAt: competitions.scheduledAt,
        location: competitions.location,
        createdByProfileId: competitions.createdByProfileId,
        startedAt: competitions.startedAt,
        completedAt: competitions.completedAt,
        createdAt: competitions.createdAt,
        updatedAt: competitions.updatedAt,
      },
      activityType: activityTypeColumns,
      owner: profileColumns,
      participantsCount:
        sql<number>`count(distinct ${competitionParticipants.id})`.mapWith(Number),
      matchesCount:
        sql<number>`count(distinct ${competitionMatches.id})`.mapWith(Number),
      completedMatchesCount:
        sql<number>`count(distinct case when ${competitionMatches.status} = 'completed' then ${competitionMatches.id} end)`.mapWith(
          Number,
        ),
    })
    .from(competitions)
    .innerJoin(activityTypes, eq(competitions.activityTypeId, activityTypes.id))
    .innerJoin(profiles, eq(competitions.createdByProfileId, profiles.id))
    .leftJoin(
      competitionParticipants,
      eq(competitionParticipants.competitionId, competitions.id),
    )
    .leftJoin(competitionMatches, eq(competitionMatches.competitionId, competitions.id))
    .groupBy(competitions.id, activityTypes.id, profiles.id);
}

export async function listCompetitionsByActivity(
  activityTypeId: string,
  options?: {
    statuses?: CompetitionStatus[];
  },
  database?: DbExecutor,
) {
  const conditions = [eq(competitions.activityTypeId, activityTypeId)];

  if (options?.statuses?.length) {
    conditions.push(inArray(competitions.status, options.statuses));
  }

  return buildCompetitionSummaryQuery(database)
    .where(and(...conditions))
    .orderBy(desc(competitions.createdAt));
}

export async function listCompetitionsByOwner(
  ownerProfileId: string,
  activityTypeId: string,
  options?: {
    statuses?: CompetitionStatus[];
  },
  database?: DbExecutor,
) {
  const conditions = [
    eq(competitions.createdByProfileId, ownerProfileId),
    eq(competitions.activityTypeId, activityTypeId),
  ];

  if (options?.statuses?.length) {
    conditions.push(inArray(competitions.status, options.statuses));
  }

  return buildCompetitionSummaryQuery(database)
    .where(and(...conditions))
    .orderBy(desc(competitions.createdAt));
}

export async function listCompetitionsVisibleToOrganizerAll(
  ownerProfileId: string,
  activityTypeId: string,
  database?: DbExecutor,
) {
  return buildCompetitionSummaryQuery(database)
    .where(
      and(
        eq(competitions.activityTypeId, activityTypeId),
        or(
          inArray(competitions.status, ["in_progress", "completed"]),
          and(
            eq(competitions.status, "draft"),
            eq(competitions.createdByProfileId, ownerProfileId),
          ),
        ),
      ),
    )
    .orderBy(desc(competitions.createdAt));
}

export async function getCompetitionById(
  competitionId: string,
  database?: DbExecutor,
) {
  const [competition] = await getDb(database)
    .select()
    .from(competitions)
    .where(eq(competitions.id, competitionId))
    .limit(1);

  return competition ?? null;
}

export async function createCompetition(
  input: CreateCompetitionInput,
  database?: DbExecutor,
) {
  const [competition] = await getDb(database)
    .insert(competitions)
    .values({
      ...input,
      title: input.title.trim(),
      location: input.location?.trim() || null,
    })
    .returning();

  return competition;
}

export async function listProfileCompetitions(
  profileId: string,
  activityTypeId: string,
  database?: DbExecutor,
) {
  return buildCompetitionSummaryQuery(database)
    .innerJoin(participants, eq(competitionParticipants.participantId, participants.id))
    .where(
      and(
        eq(participants.profileId, profileId),
        eq(participants.activityTypeId, activityTypeId),
        eq(competitions.activityTypeId, activityTypeId),
      ),
    )
    .orderBy(desc(competitions.createdAt));
}

export async function getCompetitionPageData(
  competitionId: string,
  database?: DbExecutor,
) {
  const [competition] = await buildCompetitionSummaryQuery(database)
    .where(eq(competitions.id, competitionId))
    .limit(1);

  return competition ?? null;
}

export async function getCompetitionForManagement(
  competitionId: string,
  database?: DbExecutor,
) {
  const [competition] = await getDb(database)
    .select({
      competition: {
        id: competitions.id,
        activityTypeId: competitions.activityTypeId,
        title: competitions.title,
        format: competitions.format,
        matchFormat: competitions.matchFormat,
        status: competitions.status,
        scheduledAt: competitions.scheduledAt,
        location: competitions.location,
        createdByProfileId: competitions.createdByProfileId,
        startedAt: competitions.startedAt,
        completedAt: competitions.completedAt,
        createdAt: competitions.createdAt,
        updatedAt: competitions.updatedAt,
      },
      activityType: activityTypeColumns,
      owner: profileColumns,
    })
    .from(competitions)
    .innerJoin(activityTypes, eq(competitions.activityTypeId, activityTypes.id))
    .innerJoin(profiles, eq(competitions.createdByProfileId, profiles.id))
    .where(eq(competitions.id, competitionId))
    .limit(1);

  return competition ?? null;
}
