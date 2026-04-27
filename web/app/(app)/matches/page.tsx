import { requireCurrentViewer } from "@/src/auth/current-viewer";
import {
  getDefaultActivityType,
  listActiveParticipantProfilesByActivity,
  listMatchesByActivity,
} from "@/src/db/queries";
import { MatchesListView } from "./_components/matches-list-view";

export default async function MatchesPage() {
  const viewer = await requireCurrentViewer();
  const activityType = await getDefaultActivityType();

  if (!activityType) {
    throw new Error("Default activity type is missing");
  }

  const [participantProfiles, matches] = await Promise.all([
    listActiveParticipantProfilesByActivity(activityType.id),
    listMatchesByActivity(activityType.id),
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

  const matchItems = matches.map((entry) => ({
    id: entry.match.id,
    createdAt: entry.match.createdAt.toISOString(),
    player1: entry.participant1Profile.displayName,
    player2: entry.participant2Profile.displayName,
    format: entry.match.matchFormat,
    score: {
      player1: entry.match.participant1Score,
      player2: entry.match.participant2Score,
    },
  }));

  return (
    <MatchesListView
      initialMatches={matchItems}
      opponentOptions={opponentOptions}
      viewer={viewer}
    />
  );
}
