import "server-only";

import { listCompletedCompetitionMatchesByActivity } from "./competition-matches";
import { listProfileCompetitions } from "./competitions";
import { listMatchesByActivity } from "./matches";
import { getActivityRankingViewerPosition, getProfileRanking } from "./rankings";
import { getDefaultActivityType } from "./activity-types";
import { DEFAULT_ELO_RATING, calculateUpdatedRatings } from "@/src/rating/elo";
import {
  resolveTournamentRuntimeState,
  type TournamentRuntimeState,
  type TournamentStatus,
} from "@/src/tournaments/runtime-state";

const PLAYER_HOME_TOURNAMENTS_LIMIT = 4;
const PLAYER_HOME_RATING_CHANGES_LIMIT = 5;

type ProfileCompetitionEntry = Awaited<ReturnType<typeof listProfileCompetitions>>[number];
type ActivityMatchEntry = Awaited<ReturnType<typeof listMatchesByActivity>>[number];
type ActivityCompetitionMatchEntry = Awaited<
  ReturnType<typeof listCompletedCompetitionMatchesByActivity>
>[number];

type PlayerHomeTournament = {
  activityName: string;
  hasBracket: boolean;
  id: string;
  matchFormat: "BO1" | "BO3" | "BO5";
  maxParticipants: number;
  participantsCount: number;
  runtimeState: TournamentRuntimeState;
  scheduledAt: Date | null;
  statusLabel: string;
  title: string;
};

type PlayerHomeRatingChange = {
  createdAt: Date;
  delta: number;
  id: string;
  occurredAt: Date;
  opponentName: string;
  sourceLabel: string;
};

type CombinedRatingEvent = {
  createdAt: Date;
  eventAt: Date;
  id: string;
  kind: "normal" | "competition";
  opponent1Name: string;
  opponent1ParticipantId: string;
  opponent1ProfileId: string;
  opponent2Name: string;
  opponent2ParticipantId: string;
  opponent2ProfileId: string;
  sourceLabel?: string;
  winner: "player1" | "player2";
};

function getWinRate(wins: number, matchesPlayed: number) {
  if (matchesPlayed <= 0) {
    return 0;
  }

  return Math.round((wins / matchesPlayed) * 100);
}

function compareDescDates(left: Date | null, right: Date | null) {
  const leftTimestamp = left?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rightTimestamp = right?.getTime() ?? Number.NEGATIVE_INFINITY;

  return rightTimestamp - leftTimestamp;
}

function parseScheduledSortParts(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const scheduledAt = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  const startOfDay = new Date(
    scheduledAt.getFullYear(),
    scheduledAt.getMonth(),
    scheduledAt.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  const hasExplicitTime = scheduledAt.getHours() !== 0 || scheduledAt.getMinutes() !== 0;

  return {
    dayTimestamp: startOfDay,
    hasExplicitTime,
    timestamp: scheduledAt.getTime(),
  };
}

function compareScheduledAsc(left: ProfileCompetitionEntry, right: ProfileCompetitionEntry) {
  const leftScheduled = parseScheduledSortParts(left.competition.scheduledAt);
  const rightScheduled = parseScheduledSortParts(right.competition.scheduledAt);

  if (leftScheduled && rightScheduled) {
    if (leftScheduled.dayTimestamp !== rightScheduled.dayTimestamp) {
      return leftScheduled.dayTimestamp - rightScheduled.dayTimestamp;
    }

    if (leftScheduled.hasExplicitTime !== rightScheduled.hasExplicitTime) {
      return leftScheduled.hasExplicitTime ? -1 : 1;
    }

    if (leftScheduled.hasExplicitTime && rightScheduled.hasExplicitTime) {
      if (leftScheduled.timestamp !== rightScheduled.timestamp) {
        return leftScheduled.timestamp - rightScheduled.timestamp;
      }
    }
  } else if (leftScheduled || rightScheduled) {
    return leftScheduled ? -1 : 1;
  }

  const updatedAtComparison = compareDescDates(
    left.competition.updatedAt,
    right.competition.updatedAt,
  );

  if (updatedAtComparison !== 0) {
    return updatedAtComparison;
  }

  return compareDescDates(left.competition.createdAt, right.competition.createdAt);
}

function getTournamentPriority(runtimeState: TournamentRuntimeState) {
  if (runtimeState.status === "in_progress" && !runtimeState.hasReachedStart) {
    return 1;
  }

  switch (runtimeState.effectiveStatus) {
    case "in_progress":
      return 0;
    case "ready":
      return 1;
    case "registration":
      return 2;
    case "completed":
      return 3;
    case "cancelled":
      return 4;
    case "draft":
      return 5;
  }
}

function getTournamentStatusLabel(runtimeState: TournamentRuntimeState) {
  if (runtimeState.effectiveStatus === "in_progress" && runtimeState.hasReachedStart) {
    return "Идет";
  }

  if (runtimeState.status === "registration") {
    return "Регистрация открыта";
  }

  if (runtimeState.status === "ready" || runtimeState.status === "in_progress") {
    return "Скоро начнется";
  }

  if (runtimeState.status === "completed") {
    return "Завершен";
  }

  if (runtimeState.status === "cancelled") {
    return "Отменен";
  }

  return "Черновик";
}

function getNearestTournamentStatusLabel(runtimeState: TournamentRuntimeState) {
  if (runtimeState.effectiveStatus === "in_progress" && runtimeState.hasReachedStart) {
    return "Турнир уже начался";
  }

  if (runtimeState.status === "ready" || runtimeState.status === "in_progress") {
    return "Скоро начнется";
  }

  return "Регистрация открыта";
}

function sortProfileCompetitionEntries(entries: ProfileCompetitionEntry[]) {
  return [...entries].sort((left, right) => {
    const leftRuntimeState = resolveTournamentRuntimeState({
      hasBracket: left.matchesCount > 0,
      scheduledAt: left.competition.scheduledAt,
      status: left.competition.status as TournamentStatus,
    });
    const rightRuntimeState = resolveTournamentRuntimeState({
      hasBracket: right.matchesCount > 0,
      scheduledAt: right.competition.scheduledAt,
      status: right.competition.status as TournamentStatus,
    });
    const priorityDiff =
      getTournamentPriority(leftRuntimeState) - getTournamentPriority(rightRuntimeState);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    if (
      leftRuntimeState.effectiveStatus === "in_progress" ||
      leftRuntimeState.effectiveStatus === "ready" ||
      leftRuntimeState.effectiveStatus === "registration"
    ) {
      return compareScheduledAsc(left, right);
    }

    const updatedAtComparison = compareDescDates(
      left.competition.completedAt ?? left.competition.updatedAt,
      right.competition.completedAt ?? right.competition.updatedAt,
    );

    if (updatedAtComparison !== 0) {
      return updatedAtComparison;
    }

    return compareDescDates(left.competition.createdAt, right.competition.createdAt);
  });
}

function normalizeTournament(entry: ProfileCompetitionEntry): PlayerHomeTournament {
  const runtimeState = resolveTournamentRuntimeState({
    hasBracket: entry.matchesCount > 0,
    scheduledAt: entry.competition.scheduledAt,
    status: entry.competition.status as TournamentStatus,
  });

  return {
    activityName: entry.activityType.nameRu,
    hasBracket: entry.matchesCount > 0,
    id: entry.competition.id,
    matchFormat: entry.competition.matchFormat,
    maxParticipants: entry.competition.maxParticipants,
    participantsCount: entry.participantsCount,
    runtimeState,
    scheduledAt: entry.competition.scheduledAt,
    statusLabel: getTournamentStatusLabel(runtimeState),
    title: entry.competition.title,
  };
}

function buildCombinedRatingHistory(
  profileId: string,
  normalMatches: ActivityMatchEntry[],
  tournamentMatches: ActivityCompetitionMatchEntry[],
) {
  const ratingsByParticipantId = new Map<string, number>();

  const events: CombinedRatingEvent[] = [
    ...normalMatches.map((match) => ({
      createdAt: match.match.createdAt,
      eventAt: match.match.playedAt,
      id: `match:${match.match.id}`,
      kind: "normal" as const,
      opponent1Name: match.participant1Profile.displayName,
      opponent1ParticipantId: match.participant1.id,
      opponent1ProfileId: match.participant1Profile.id,
      opponent2Name: match.participant2Profile.displayName,
      opponent2ParticipantId: match.participant2.id,
      opponent2ProfileId: match.participant2Profile.id,
      winner:
        match.winnerParticipant.id === match.participant1.id
          ? ("player1" as const)
          : ("player2" as const),
    })),
    ...tournamentMatches.flatMap((match) => {
      if (
        !match.slot1Participant?.id ||
        !match.slot2Participant?.id ||
        !match.slot1Profile?.id ||
        !match.slot2Profile?.id ||
        !match.winnerParticipant?.id
      ) {
        return [];
      }

      return [
        {
          createdAt: match.competitionMatch.createdAt,
          eventAt:
            match.competitionMatch.completedAt ??
            match.competitionMatch.updatedAt ??
            match.competitionMatch.createdAt,
          id: `competition-match:${match.competitionMatch.id}`,
          kind: "competition" as const,
          opponent1Name: match.slot1Profile.displayName,
          opponent1ParticipantId: match.slot1Participant.id,
          opponent1ProfileId: match.slot1Profile.id,
          opponent2Name: match.slot2Profile.displayName,
          opponent2ParticipantId: match.slot2Participant.id,
          opponent2ProfileId: match.slot2Profile.id,
          sourceLabel: match.competition.title,
          winner:
            match.winnerParticipant.id === match.slot1Participant.id
              ? ("player1" as const)
              : ("player2" as const),
        },
      ];
    }),
  ].sort((left, right) => {
    const eventAtDiff = left.eventAt.getTime() - right.eventAt.getTime();

    if (eventAtDiff !== 0) {
      return eventAtDiff;
    }

    const createdAtDiff = left.createdAt.getTime() - right.createdAt.getTime();

    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return left.id.localeCompare(right.id);
  });

  const ratingChanges: PlayerHomeRatingChange[] = [];

  for (const event of events) {
    const player1Rating =
      ratingsByParticipantId.get(event.opponent1ParticipantId) ?? DEFAULT_ELO_RATING;
    const player2Rating =
      ratingsByParticipantId.get(event.opponent2ParticipantId) ?? DEFAULT_ELO_RATING;
    const updatedRatings = calculateUpdatedRatings(player1Rating, player2Rating, event.winner);

    ratingsByParticipantId.set(event.opponent1ParticipantId, updatedRatings.player1Rating);
    ratingsByParticipantId.set(event.opponent2ParticipantId, updatedRatings.player2Rating);

    if (event.opponent1ProfileId !== profileId && event.opponent2ProfileId !== profileId) {
      continue;
    }

    const viewerIsPlayer1 = event.opponent1ProfileId === profileId;
    const viewerBeforeRating = viewerIsPlayer1 ? player1Rating : player2Rating;
    const viewerAfterRating = viewerIsPlayer1
      ? updatedRatings.player1Rating
      : updatedRatings.player2Rating;

    ratingChanges.push({
      createdAt: event.createdAt,
      delta: viewerAfterRating - viewerBeforeRating,
      id: event.id,
      occurredAt: event.eventAt,
      opponentName: viewerIsPlayer1 ? event.opponent2Name : event.opponent1Name,
      sourceLabel:
        event.kind === "competition" ? (event.sourceLabel ?? "Турнир") : "Обычный матч",
    });
  }

  return [...ratingChanges]
    .sort((left, right) => {
      const createdAtDiff = right.createdAt.getTime() - left.createdAt.getTime();

      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return right.id.localeCompare(left.id);
    })
    .slice(0, PLAYER_HOME_RATING_CHANGES_LIMIT);
}

export async function getPlayerHomeData(profileId: string) {
  const activityType = await getDefaultActivityType();

  if (!activityType) {
    return {
      nearestTournament: null,
      ratingChanges: [],
      stats: {
        elo: null as number | null,
        losses: 0,
        matches: 0,
        place: null as number | null,
        winRate: 0,
        wins: 0,
      },
      tournaments: [],
    };
  }

  const [profileRanking, viewerPosition, competitions, normalMatches, tournamentMatches] =
    await Promise.all([
      getProfileRanking(profileId, activityType.id),
      getActivityRankingViewerPosition(activityType.id, profileId),
      listProfileCompetitions(profileId, activityType.id),
      listMatchesByActivity(activityType.id),
      listCompletedCompetitionMatchesByActivity(activityType.id),
    ]);

  const sortedCompetitions = sortProfileCompetitionEntries(competitions);
  const nearestTournamentEntry = sortedCompetitions.find((entry) => {
    const runtimeState = resolveTournamentRuntimeState({
      hasBracket: entry.matchesCount > 0,
      scheduledAt: entry.competition.scheduledAt,
      status: entry.competition.status as TournamentStatus,
    });

    return (
      runtimeState.effectiveStatus === "in_progress" ||
      runtimeState.status === "ready" ||
      runtimeState.status === "registration"
    );
  });

  return {
    nearestTournament: nearestTournamentEntry
      ? {
          ...normalizeTournament(nearestTournamentEntry),
          statusLabel: getNearestTournamentStatusLabel(
            resolveTournamentRuntimeState({
              hasBracket: nearestTournamentEntry.matchesCount > 0,
              scheduledAt: nearestTournamentEntry.competition.scheduledAt,
              status: nearestTournamentEntry.competition.status as TournamentStatus,
            }),
          ),
        }
      : null,
    ratingChanges: buildCombinedRatingHistory(profileId, normalMatches, tournamentMatches),
    stats: {
      elo: profileRanking?.ranking.rating ?? null,
      losses: profileRanking?.ranking.losses ?? 0,
      matches: profileRanking?.ranking.matchesPlayed ?? 0,
      place: viewerPosition,
      winRate: getWinRate(
        profileRanking?.ranking.wins ?? 0,
        profileRanking?.ranking.matchesPlayed ?? 0,
      ),
      wins: profileRanking?.ranking.wins ?? 0,
    },
    tournaments: sortedCompetitions
      .filter((entry) => entry.competition.id !== nearestTournamentEntry?.competition.id)
      .slice(0, PLAYER_HOME_TOURNAMENTS_LIMIT)
      .map(normalizeTournament),
  };
}
