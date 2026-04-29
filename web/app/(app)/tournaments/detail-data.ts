import "server-only";

import type { AuthenticatedViewer } from "@/src/auth/current-viewer";
import {
  getCompetitionBracket,
  getCompetitionForManagement,
  getCompetitionParticipants,
  listActiveParticipantProfilesByActivity,
} from "@/src/db/queries";

export async function getTournamentDetailData(
  viewer: AuthenticatedViewer,
  competitionId: string,
) {
  const competitionData = await getCompetitionForManagement(competitionId);

  if (!competitionData) {
    return null;
  }

  const isPublishedCompetition =
    competitionData.competition.status === "in_progress" ||
    competitionData.competition.status === "completed";
  const isAdmin = viewer.role === "admin";
  const isOrganizerOwner =
    viewer.role === "organizer" &&
    competitionData.competition.createdByProfileId === viewer.profileId;
  const canViewCompetition =
    isAdmin ||
    isOrganizerOwner ||
    isPublishedCompetition;

  if (!canViewCompetition) {
    return null;
  }

  const [participants, bracket, availableParticipants] = await Promise.all([
    getCompetitionParticipants(competitionId),
    getCompetitionBracket(competitionId),
    listActiveParticipantProfilesByActivity(competitionData.competition.activityTypeId),
  ]);

  const isDraft = competitionData.competition.status === "draft";
  const canManageDraft = isDraft && (isAdmin || isOrganizerOwner);

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

  function buildProjectedSeedMap() {
    const sortedParticipants = [...participants].sort((left, right) => {
      const leftRating = left.ranking?.rating ?? 1000;
      const rightRating = right.ranking?.rating ?? 1000;

      return rightRating - leftRating;
    });

    return new Map(
      sortedParticipants.map((entry, index) => [entry.participant.id, index + 1] as const),
    );
  }

  function buildGeneratedSeedMap() {
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

  const seedMap = buildGeneratedSeedMap() ?? buildProjectedSeedMap();

  const participantIdsInTournament = new Set(
    participants.map((entry) => entry.participant.id),
  );

  const participantOptions = canManageDraft
    ? availableParticipants
        .filter((entry) => !participantIdsInTournament.has(entry.participantId))
        .map((entry) => ({
          id: entry.participantId,
          name:
            entry.firstName && entry.lastName
              ? `${entry.firstName} ${entry.lastName}`
              : entry.displayName,
        }))
    : [];
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
      participantId: participant.participantId,
      rating: participant.rating,
      seed: participant.seed,
    }));

  return {
    bracket: bracket.map((round) => ({
      roundNumber: round.roundNumber,
      matches: round.matches.map((match) => ({
        id: match.competitionMatch.id,
        matchNumber: match.competitionMatch.matchNumber,
        resolutionType: match.competitionMatch.resolutionType,
        roundNumber: match.competitionMatch.roundNumber,
        slot1Seed: match.competitionMatch.slot1ParticipantId
          ? seedMap.get(match.competitionMatch.slot1ParticipantId) ?? null
          : null,
        slot2Seed: match.competitionMatch.slot2ParticipantId
          ? seedMap.get(match.competitionMatch.slot2ParticipantId) ?? null
          : null,
        slot1Score: match.competitionMatch.slot1Score,
        slot2Score: match.competitionMatch.slot2Score,
        slot1DisplayName: match.slot1Profile?.displayName ?? null,
        slot2DisplayName: match.slot2Profile?.displayName ?? null,
        status: match.competitionMatch.status,
        winnerDisplayName: match.winnerProfile?.displayName ?? null,
      })),
    })),
    canManageDraft,
    competitionData,
    participantOptions,
    participants: seededParticipants,
  };
}
