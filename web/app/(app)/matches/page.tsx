import { requireCurrentViewer } from "@/src/auth/current-viewer";
import {
  getDefaultActivityType,
  listActiveParticipantProfilesByActivity,
  listCompletedCompetitionMatchesByActivity,
  listMatchesByActivity,
} from "@/src/db/queries";
import {
  DEFAULT_ELO_RATING,
  calculateUpdatedRatings,
  type EloMatchWinner,
} from "@/src/rating/elo";
import { MatchesListView } from "./_components/matches-list-view";

type MatchTimelineEntry = {
  createdAt: Date;
  eventAt: Date;
  format: "BO1" | "BO3" | "BO5";
  id: string;
  matchType: "normal" | "tournament";
  player1: string;
  player1Id: string;
  player1Score: number;
  player2: string;
  player2Id: string;
  player2Score: number;
  winner: EloMatchWinner;
};

export default async function MatchesPage() {
  const viewer = await requireCurrentViewer();
  const activityType = await getDefaultActivityType();

  if (!activityType) {
    throw new Error("Default activity type is missing");
  }

  const [participantProfiles, matches, tournamentMatches] = await Promise.all([
    listActiveParticipantProfilesByActivity(activityType.id),
    listMatchesByActivity(activityType.id),
    listCompletedCompetitionMatchesByActivity(activityType.id),
  ]);

  const opponentOptions = participantProfiles
    .filter((participantProfile) => participantProfile.profileId !== viewer.profileId)
    .map((participantProfile) => ({
      id: participantProfile.participantId,
      name:
        participantProfile.firstName && participantProfile.lastName
          ? `${participantProfile.firstName} ${participantProfile.lastName}`
          : participantProfile.displayName,
    }));

  const normalTimelineEntries: MatchTimelineEntry[] = matches.map((entry) => ({
    createdAt: entry.match.createdAt,
    eventAt: entry.match.playedAt,
    format: entry.match.matchFormat,
    id: entry.match.id,
    matchType: "normal",
    player1: entry.participant1Profile.displayName,
    player1Id: entry.participant1.id,
    player1Score: entry.match.participant1Score,
    player2: entry.participant2Profile.displayName,
    player2Id: entry.participant2.id,
    player2Score: entry.match.participant2Score,
    winner:
      entry.winnerParticipant.id === entry.participant1.id ? "player1" : "player2",
  }));

  const tournamentTimelineEntries: MatchTimelineEntry[] = tournamentMatches.flatMap((entry) => {
    const slot1DisplayName = entry.slot1Profile?.displayName;
    const slot2DisplayName = entry.slot2Profile?.displayName;
    const slot1ParticipantId = entry.slot1Participant?.id;
    const slot2ParticipantId = entry.slot2Participant?.id;
    const winnerParticipantId = entry.winnerParticipant?.id;
    const slot1Score = entry.competitionMatch.slot1Score;
    const slot2Score = entry.competitionMatch.slot2Score;
    const isPlayedMatch =
      entry.competitionMatch.resolutionType === "played" &&
      slot1DisplayName &&
      slot2DisplayName &&
      slot1ParticipantId &&
      slot2ParticipantId &&
      winnerParticipantId &&
      slot1Score !== null &&
      slot2Score !== null;

    if (!isPlayedMatch) {
      return [];
    }

    return [
      {
        createdAt: entry.competitionMatch.createdAt,
        eventAt:
          entry.competitionMatch.completedAt ??
          entry.competitionMatch.updatedAt ??
          entry.competitionMatch.createdAt,
        format: entry.competition.matchFormat,
        id: `competition-match:${entry.competitionMatch.id}`,
        matchType: "tournament" as const,
        player1: slot1DisplayName,
        player1Id: slot1ParticipantId,
        player1Score: slot1Score,
        player2: slot2DisplayName,
        player2Id: slot2ParticipantId,
        player2Score: slot2Score,
        winner: winnerParticipantId === slot1ParticipantId ? "player1" : "player2",
      },
    ];
  });

  const ratingsByParticipantId = new Map<string, number>();

  const matchItems = [...normalTimelineEntries, ...tournamentTimelineEntries]
    .sort((left, right) => {
      const eventAtDiff = left.eventAt.getTime() - right.eventAt.getTime();

      if (eventAtDiff !== 0) {
        return eventAtDiff;
      }

      const createdAtDiff = left.createdAt.getTime() - right.createdAt.getTime();

      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return left.id.localeCompare(right.id);
    })
    .map((entry) => {
      const player1Rating = ratingsByParticipantId.get(entry.player1Id) ?? DEFAULT_ELO_RATING;
      const player2Rating = ratingsByParticipantId.get(entry.player2Id) ?? DEFAULT_ELO_RATING;
      const updatedRatings = calculateUpdatedRatings(
        player1Rating,
        player2Rating,
        entry.winner,
      );

      ratingsByParticipantId.set(entry.player1Id, updatedRatings.player1Rating);
      ratingsByParticipantId.set(entry.player2Id, updatedRatings.player2Rating);

      const winnerRatingDelta =
        entry.winner === "player1"
          ? updatedRatings.player1Delta
          : updatedRatings.player2Delta;
      const loserRatingDelta =
        entry.winner === "player1"
          ? updatedRatings.player2Delta
          : updatedRatings.player1Delta;

      return {
        id: entry.id,
        createdAt: entry.eventAt.toISOString(),
        format: entry.format,
        loserRatingDelta,
        matchType: entry.matchType,
        player1: entry.player1,
        player2: entry.player2,
        score: {
          player1: entry.player1Score,
          player2: entry.player2Score,
        },
        winnerRatingDelta,
      };
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return (
    <MatchesListView
      initialMatches={matchItems}
      opponentOptions={opponentOptions}
      viewer={viewer}
    />
  );
}
