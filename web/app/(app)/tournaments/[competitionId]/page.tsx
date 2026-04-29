import { redirect } from "next/navigation";
import { requireCurrentViewer } from "@/src/auth/current-viewer";
import { TournamentDetailSheet } from "../_components/tournament-detail-sheet";
import { getTournamentDetailData } from "../detail-data";

type TournamentDetailPageProps = {
  params: Promise<{
    competitionId: string;
  }>;
};

export default async function TournamentDetailPage({
  params,
}: TournamentDetailPageProps) {
  const viewer = await requireCurrentViewer();
  const { competitionId } = await params;
  const detailData = await getTournamentDetailData(viewer, competitionId);

  if (!detailData) {
    redirect("/tournaments");
  }

  return (
    <TournamentDetailSheet
      bracket={detailData.bracket}
      canManageDraft={detailData.canManageDraft}
      closeHref="/tournaments"
      competition={{
        activityName: detailData.competitionData.activityType.nameRu,
        createdByProfileId: detailData.competitionData.competition.createdByProfileId,
        id: detailData.competitionData.competition.id,
        location: detailData.competitionData.competition.location,
        matchFormat: detailData.competitionData.competition.matchFormat,
        organizerName: detailData.competitionData.owner.displayName,
        scheduledAt: detailData.competitionData.competition.scheduledAt
          ? detailData.competitionData.competition.scheduledAt.toISOString()
          : null,
        status: detailData.competitionData.competition.status as
          | "draft"
          | "in_progress"
          | "completed",
        title: detailData.competitionData.competition.title,
      }}
      participantOptions={detailData.participantOptions}
      participants={detailData.participants}
      presentation="page"
      viewer={viewer}
    />
  );
}
