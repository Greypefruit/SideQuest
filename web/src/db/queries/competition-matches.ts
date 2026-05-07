import "server-only";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type DbExecutor } from "../index";
import { competitionMatches, competitions, participants, profiles } from "../schema";
import { getDb } from "./shared";

const slot1Participant = alias(participants, "competition_slot1_participant");
const slot2Participant = alias(participants, "competition_slot2_participant");
const winnerParticipant = alias(participants, "competition_winner_participant");
const slot1Profile = alias(profiles, "competition_slot1_profile");
const slot2Profile = alias(profiles, "competition_slot2_profile");
const winnerProfile = alias(profiles, "competition_winner_profile");
const reporterProfile = alias(profiles, "competition_reporter_profile");

type CreateCompetitionMatchInput = Pick<
  typeof competitionMatches.$inferInsert,
  | "competitionId"
  | "roundNumber"
  | "matchNumber"
  | "slot1ParticipantId"
  | "slot2ParticipantId"
  | "slot1Score"
  | "slot2Score"
  | "winnerParticipantId"
  | "status"
  | "resolutionType"
  | "nextMatchId"
  | "nextMatchSlot"
  | "reportedByProfileId"
  | "completedAt"
>;

type UpdateCompetitionMatchResultInput = Partial<
  Pick<
    typeof competitionMatches.$inferInsert,
    | "slot1Score"
    | "slot2Score"
    | "winnerParticipantId"
    | "status"
    | "resolutionType"
    | "reportedByProfileId"
    | "completedAt"
    | "slot1ParticipantId"
    | "slot2ParticipantId"
    | "nextMatchId"
    | "nextMatchSlot"
  >
>;

function buildCompetitionMatchesQuery(database?: DbExecutor) {
  return getDb(database)
    .select({
      competitionMatch: {
        id: competitionMatches.id,
        competitionId: competitionMatches.competitionId,
        roundNumber: competitionMatches.roundNumber,
        matchNumber: competitionMatches.matchNumber,
        slot1ParticipantId: competitionMatches.slot1ParticipantId,
        slot2ParticipantId: competitionMatches.slot2ParticipantId,
        slot1Score: competitionMatches.slot1Score,
        slot2Score: competitionMatches.slot2Score,
        winnerParticipantId: competitionMatches.winnerParticipantId,
        status: competitionMatches.status,
        resolutionType: competitionMatches.resolutionType,
        nextMatchId: competitionMatches.nextMatchId,
        nextMatchSlot: competitionMatches.nextMatchSlot,
        reportedByProfileId: competitionMatches.reportedByProfileId,
        completedAt: competitionMatches.completedAt,
        createdAt: competitionMatches.createdAt,
        updatedAt: competitionMatches.updatedAt,
      },
      competition: {
        id: competitions.id,
        activityTypeId: competitions.activityTypeId,
        title: competitions.title,
        format: competitions.format,
        matchFormat: competitions.matchFormat,
        status: competitions.status,
      },
      slot1Participant: {
        id: slot1Participant.id,
        profileId: slot1Participant.profileId,
        activityTypeId: slot1Participant.activityTypeId,
        isActive: slot1Participant.isActive,
        createdAt: slot1Participant.createdAt,
        updatedAt: slot1Participant.updatedAt,
      },
      slot1Profile: {
        id: slot1Profile.id,
        email: slot1Profile.email,
        displayName: slot1Profile.displayName,
        role: slot1Profile.role,
        isActive: slot1Profile.isActive,
      },
      slot2Participant: {
        id: slot2Participant.id,
        profileId: slot2Participant.profileId,
        activityTypeId: slot2Participant.activityTypeId,
        isActive: slot2Participant.isActive,
        createdAt: slot2Participant.createdAt,
        updatedAt: slot2Participant.updatedAt,
      },
      slot2Profile: {
        id: slot2Profile.id,
        email: slot2Profile.email,
        displayName: slot2Profile.displayName,
        role: slot2Profile.role,
        isActive: slot2Profile.isActive,
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
      reportedByProfile: {
        id: reporterProfile.id,
        authUserId: reporterProfile.authUserId,
        email: reporterProfile.email,
        displayName: reporterProfile.displayName,
        role: reporterProfile.role,
        isActive: reporterProfile.isActive,
        createdAt: reporterProfile.createdAt,
        updatedAt: reporterProfile.updatedAt,
      },
    })
    .from(competitionMatches)
    .innerJoin(competitions, eq(competitionMatches.competitionId, competitions.id))
    .leftJoin(slot1Participant, eq(competitionMatches.slot1ParticipantId, slot1Participant.id))
    .leftJoin(slot2Participant, eq(competitionMatches.slot2ParticipantId, slot2Participant.id))
    .leftJoin(winnerParticipant, eq(competitionMatches.winnerParticipantId, winnerParticipant.id))
    .leftJoin(slot1Profile, eq(slot1Participant.profileId, slot1Profile.id))
    .leftJoin(slot2Profile, eq(slot2Participant.profileId, slot2Profile.id))
    .leftJoin(winnerProfile, eq(winnerParticipant.profileId, winnerProfile.id))
    .leftJoin(reporterProfile, eq(competitionMatches.reportedByProfileId, reporterProfile.id));
}

export async function getCompetitionBracket(
  competitionId: string,
  database?: DbExecutor,
) {
  const matches = await listCompetitionMatches(competitionId, database);
  const bracket = new Map<number, typeof matches>();

  for (const match of matches) {
    const round = bracket.get(match.competitionMatch.roundNumber);

    if (round) {
      round.push(match);
      continue;
    }

    bracket.set(match.competitionMatch.roundNumber, [match]);
  }

  return [...bracket.entries()].map(([roundNumber, roundMatches]) => ({
    roundNumber,
    matches: roundMatches,
  }));
}

export async function listCompetitionMatches(
  competitionId: string,
  database?: DbExecutor,
) {
  return buildCompetitionMatchesQuery(database)
    .where(eq(competitionMatches.competitionId, competitionId))
    .orderBy(
      asc(competitionMatches.roundNumber),
      asc(competitionMatches.matchNumber),
      asc(competitionMatches.createdAt),
    );
}

export async function getCompetitionMatchById(
  competitionMatchId: string,
  database?: DbExecutor,
) {
  const [competitionMatch] = await buildCompetitionMatchesQuery(database)
    .where(eq(competitionMatches.id, competitionMatchId))
    .limit(1);

  return competitionMatch ?? null;
}

export async function createCompetitionMatch(
  input: CreateCompetitionMatchInput,
  database?: DbExecutor,
) {
  const [competitionMatch] = await getDb(database)
    .insert(competitionMatches)
    .values(input)
    .returning();

  return competitionMatch;
}

export async function createCompetitionMatches(
  input: CreateCompetitionMatchInput[],
  database?: DbExecutor,
) {
  if (input.length === 0) {
    return [];
  }

  return getDb(database).insert(competitionMatches).values(input).returning();
}

export async function updateCompetitionMatchResult(
  competitionMatchId: string,
  input: UpdateCompetitionMatchResultInput,
  database?: DbExecutor,
) {
  const patch: UpdateCompetitionMatchResultInput & { updatedAt?: Date } = {
    ...input,
  };

  patch.updatedAt = new Date();

  const [competitionMatch] = await getDb(database)
    .update(competitionMatches)
    .set(patch)
    .where(eq(competitionMatches.id, competitionMatchId))
    .returning();

  return competitionMatch ?? null;
}

export async function listPendingCompetitionMatches(
  competitionId: string,
  database?: DbExecutor,
) {
  return buildCompetitionMatchesQuery(database)
    .where(
      and(
        eq(competitionMatches.competitionId, competitionId),
        eq(competitionMatches.status, "pending"),
      ),
    )
    .orderBy(
      asc(competitionMatches.roundNumber),
      asc(competitionMatches.matchNumber),
      asc(competitionMatches.createdAt),
    );
}

export async function listPendingCompetitionMatchesByCompetitionIds(
  competitionIds: string[],
  database?: DbExecutor,
) {
  if (competitionIds.length === 0) {
    return [];
  }

  return buildCompetitionMatchesQuery(database)
    .where(
      and(
        inArray(competitionMatches.competitionId, competitionIds),
        eq(competitionMatches.status, "pending"),
      ),
    )
    .orderBy(
      asc(competitionMatches.roundNumber),
      asc(competitionMatches.matchNumber),
      asc(competitionMatches.createdAt),
    );
}

export async function listCompletedCompetitionMatches(
  competitionId: string,
  database?: DbExecutor,
) {
  return buildCompetitionMatchesQuery(database)
    .where(
      and(
        eq(competitionMatches.competitionId, competitionId),
        eq(competitionMatches.status, "completed"),
      ),
    )
    .orderBy(
      asc(competitionMatches.roundNumber),
      asc(competitionMatches.matchNumber),
      asc(competitionMatches.createdAt),
    );
}

export async function listCompletedCompetitionMatchesByActivity(
  activityTypeId: string,
  database?: DbExecutor,
) {
  return buildCompetitionMatchesQuery(database)
    .where(
      and(
        eq(competitions.activityTypeId, activityTypeId),
        eq(competitionMatches.status, "completed"),
      ),
    )
    .orderBy(
      desc(competitionMatches.completedAt),
      desc(competitionMatches.createdAt),
      desc(competitionMatches.roundNumber),
      desc(competitionMatches.matchNumber),
    );
}

export async function listProfileCompetitionMatches(
  profileId: string,
  activityTypeId: string,
  database?: DbExecutor,
) {
  return buildCompetitionMatchesQuery(database)
    .where(
      and(
        eq(competitions.activityTypeId, activityTypeId),
        eq(competitionMatches.status, "completed"),
        or(eq(slot1Participant.profileId, profileId), eq(slot2Participant.profileId, profileId)),
      ),
    )
    .orderBy(
      desc(competitionMatches.completedAt),
      desc(competitionMatches.createdAt),
      desc(competitionMatches.roundNumber),
      desc(competitionMatches.matchNumber),
    );
}
