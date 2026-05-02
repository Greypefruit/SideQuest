import { redirect } from "next/navigation";
import { requireCurrentViewer } from "@/src/auth/current-viewer";
import { TournamentDetailView } from "../_components/tournament-detail-view";
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
    <TournamentDetailView
      closeHref="/tournaments"
      competition={{
        activityName: detailData.competitionData.activityType.nameRu,
        id: detailData.competitionData.competition.id,
        location: detailData.competitionData.competition.location,
        matchFormat: detailData.competitionData.competition.matchFormat,
        maxParticipants: detailData.competitionData.competition.maxParticipants,
        organizerName: detailData.competitionData.owner.displayName,
        scheduledAt: detailData.competitionData.competition.scheduledAt
          ? detailData.competitionData.competition.scheduledAt.toISOString()
          : null,
        status: detailData.competitionData.competition.status as
          | "draft"
          | "registration"
          | "ready"
          | "in_progress"
          | "completed"
          | "cancelled",
        title: detailData.competitionData.competition.title,
      }}
      participantOptions={detailData.participantOptions}
      participants={detailData.participants}
      permissions={detailData.permissions}
      rounds={detailData.rounds}
      runtimeState={detailData.runtimeState}
      viewerRegistration={detailData.viewerRegistration}
    />
  );
}
