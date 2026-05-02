import "server-only";

import type { AuthenticatedViewer } from "@/src/auth/current-viewer";
import {
  getCompetitionBracket,
  getCompetitionForManagement,
  getCompetitionParticipants,
  getParticipantByProfileAndActivity,
  listActiveParticipantProfilesByActivity,
} from "@/src/db/queries";
import {
  resolveTournamentRuntimeState,
  type TournamentStatus,
} from "@/src/tournaments/runtime-state";

function getBracketSize(participantCount: number) {
  let bracketSize = 1;

  while (bracketSize < participantCount) {
    bracketSize *= 2;
  }

  return bracketSize;
}

function buildSeedOrder(bracketSize: number) {
  let seedOrder = [1];

  while (seedOrder.length < bracketSize) {
    const nextSize = seedOrder.length * 2;
    seedOrder = seedOrder.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }

  return seedOrder;
}

function buildProjectedSeedMap(
  participants: Awaited<ReturnType<typeof getCompetitionParticipants>>,
) {
  const sortedParticipants = [...participants].sort((left, right) => {
    const leftRating = left.ranking?.rating ?? 1000;
    const rightRating = right.ranking?.rating ?? 1000;

    return rightRating - leftRating;
  });

  return new Map(
    sortedParticipants.map((entry, index) => [entry.participant.id, index + 1] as const),
  );
}

function buildGeneratedSeedMap(
  participants: Awaited<ReturnType<typeof getCompetitionParticipants>>,
  bracket: Awaited<ReturnType<typeof getCompetitionBracket>>,
) {
  const firstRound = bracket.find((round) => round.roundNumber === 1);

  if (!firstRound) {
    return null;
  }

  const seedOrder = buildSeedOrder(getBracketSize(participants.length));
  const seededParticipants = new Map<string, number>();

  firstRound.matches.forEach((match, index) => {
    const slot1Seed = seedOrder[index * 2];
    const slot2Seed = seedOrder[index * 2 + 1];

    if (match.competitionMatch.slot1ParticipantId) {
      seededParticipants.set(match.competitionMatch.slot1ParticipantId, slot1Seed);
    }

    if (match.competitionMatch.slot2ParticipantId) {
      seededParticipants.set(match.competitionMatch.slot2ParticipantId, slot2Seed);
    }
  });

  return seededParticipants;
}

function getRoundLabel(roundNumber: number, totalRounds: number) {
  const roundsRemaining = totalRounds - roundNumber;

  if (roundsRemaining <= 0) {
    return "Финал";
  }

  if (roundsRemaining === 1) {
    return "1/2 финала";
  }

  if (roundsRemaining === 2) {
    return "1/4 финала";
  }

  if (roundsRemaining === 3) {
    return "1/8 финала";
  }

  return `Раунд ${roundNumber}`;
}

export async function getTournamentDetailData(
  viewer: AuthenticatedViewer,
  competitionId: string,
) {
  const competitionData = await getCompetitionForManagement(competitionId);

  if (!competitionData) {
    return null;
  }

  const isPublishedCompetition = competitionData.competition.status !== "draft";
  const isAdmin = viewer.role === "admin";
  const isOrganizerOwner =
    viewer.role === "organizer" &&
    competitionData.competition.createdByProfileId === viewer.profileId;
  const canViewCompetition = isAdmin || isOrganizerOwner || isPublishedCompetition;

  if (!canViewCompetition) {
    return null;
  }

  const canManageCompetition = isAdmin || isOrganizerOwner;

  const [participants, bracket, activityParticipants, viewerParticipant] = await Promise.all([
    getCompetitionParticipants(competitionId),
    getCompetitionBracket(competitionId),
    canManageCompetition
      ? listActiveParticipantProfilesByActivity(competitionData.competition.activityTypeId)
      : Promise.resolve([]),
    getParticipantByProfileAndActivity(viewer.profileId, competitionData.competition.activityTypeId),
  ]);
  const runtimeState = resolveTournamentRuntimeState({
    hasBracket: bracket.length > 0,
    scheduledAt: competitionData.competition.scheduledAt,
    status: competitionData.competition.status as TournamentStatus,
  });

  const seedMap = buildGeneratedSeedMap(participants, bracket) ?? buildProjectedSeedMap(participants);
  const existingParticipantIds = new Set(participants.map((entry) => entry.participant.id));
  const viewerParticipantId = viewerParticipant?.id ?? null;
  const isViewerRegistered =
    viewerParticipantId !== null && existingParticipantIds.has(viewerParticipantId);

  const seededParticipants = participants
    .map((entry, index) => ({
      competitionParticipantId: entry.competitionParticipant.id,
      displayName: entry.profile.displayName,
      participantId: entry.participant.id,
      rating: entry.ranking?.rating ?? null,
      seed: seedMap.get(entry.participant.id) ?? null,
      originalIndex: index,
    }))
    .sort((left, right) => {
      if (left.seed !== null && right.seed !== null) {
        return left.seed - right.seed;
      }

      if (left.seed !== null) {
        return -1;
      }

      if (right.seed !== null) {
        return 1;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map((participant) => ({
      competitionParticipantId: participant.competitionParticipantId,
      displayName: participant.displayName,
      losses:
        participants[participant.originalIndex]?.ranking?.losses ?? 0,
      matchesPlayed:
        participants[participant.originalIndex]?.ranking?.matchesPlayed ?? 0,
      participantId: participant.participantId,
      rating: participant.rating,
      seed: participant.seed,
      wins:
        participants[participant.originalIndex]?.ranking?.wins ?? 0,
    }));

  const rounds = bracket.map((round) => {
    const completedMatches = round.matches.filter(
      (match) => match.competitionMatch.status === "completed",
    ).length;

    return {
      completedMatches,
      label: getRoundLabel(round.roundNumber, bracket.length),
      matches: round.matches.map((match) => {
        const slot1ParticipantId = match.competitionMatch.slot1ParticipantId;
        const slot2ParticipantId = match.competitionMatch.slot2ParticipantId;
        const isBye = match.competitionMatch.resolutionType === "bye";
        const isPending = match.competitionMatch.status === "pending";
        const hasBothParticipants = Boolean(slot1ParticipantId && slot2ParticipantId);

        return {
          id: match.competitionMatch.id,
          isFinal: match.competitionMatch.nextMatchId === null,
          matchNumber: match.competitionMatch.matchNumber,
          nextMatchId: match.competitionMatch.nextMatchId,
          resolutionType: match.competitionMatch.resolutionType,
          roundNumber: match.competitionMatch.roundNumber,
          slot1: {
            displayName: match.slot1Profile?.displayName ?? null,
            participantId: slot1ParticipantId,
            seed: slot1ParticipantId ? seedMap.get(slot1ParticipantId) ?? null : null,
          },
          slot1Score: match.competitionMatch.slot1Score,
          slot2: {
            displayName: match.slot2Profile?.displayName ?? null,
            participantId: slot2ParticipantId,
            seed: slot2ParticipantId ? seedMap.get(slot2ParticipantId) ?? null : null,
          },
          slot2Score: match.competitionMatch.slot2Score,
          status: match.competitionMatch.status,
          winnerParticipantId: match.competitionMatch.winnerParticipantId,
          canSubmitResult:
            canManageCompetition &&
            runtimeState.effectiveStatus === "in_progress" &&
            isPending &&
            !isBye &&
            hasBothParticipants,
        };
      }),
      matchesCount: round.matches.length,
      pendingMatches: round.matches.length - completedMatches,
      roundNumber: round.roundNumber,
    };
  });

  return {
    competitionData,
    participants: seededParticipants,
    permissions: {
      canCancelTournament:
        canManageCompetition &&
        competitionData.competition.status !== "draft" &&
        !runtimeState.isTerminal,
      canDeleteTournament:
        canManageCompetition && competitionData.competition.status === "draft",
      canEditDraft:
        canManageCompetition && competitionData.competition.status === "draft",
      canGenerateBracket: canManageCompetition && runtimeState.canGenerateBracket,
      canManageParticipantAdd:
        canManageCompetition &&
        (competitionData.competition.status === "draft" ||
          competitionData.competition.status === "registration"),
      canManageParticipantRemove:
        canManageCompetition &&
        (competitionData.competition.status === "draft" ||
          competitionData.competition.status === "registration"),
      canManageResults:
        canManageCompetition && runtimeState.effectiveStatus === "in_progress",
      canManageTournament: canManageCompetition,
      canMoveToReady:
        canManageCompetition && competitionData.competition.status === "draft",
      canOpenRegistration:
        canManageCompetition &&
        (competitionData.competition.status === "draft" ||
          (competitionData.competition.status === "ready" && !runtimeState.hasBracket)),
      canCloseRegistration:
        canManageCompetition && competitionData.competition.status === "registration",
      isAdmin,
      isOrganizerOwner,
    },
    participantOptions: activityParticipants
      .filter((entry) => !existingParticipantIds.has(entry.participantId))
      .map((entry) => ({
        displayName: entry.displayName,
        participantId: entry.participantId,
      })),
    rounds,
    runtimeState,
    viewerRegistration: {
      canSelfRegister:
        !canManageCompetition &&
        viewer.role !== "admin" &&
        runtimeState.status === "registration",
      isViewerRegistered,
      viewerParticipantId,
    },
  };
}
