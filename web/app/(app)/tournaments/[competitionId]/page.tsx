import { redirect } from "next/navigation";
import { requireCurrentViewer } from "@/src/auth/current-viewer";
import { TournamentDetailView } from "../_components/tournament-detail-view";
import { getTournamentDetailData } from "../detail-data";

type TournamentDetailPageProps = {
  params: Promise<{
    competitionId: string;
  }>;
  searchParams?: Promise<{
    tab?: string | string[] | undefined;
  }>;
};

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function TournamentDetailPage({
  params,
  searchParams,
}: TournamentDetailPageProps) {
  const viewer = await requireCurrentViewer();
  const { competitionId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tabParam = getSingleSearchParam(resolvedSearchParams?.tab);
  const initialTab =
    tabParam === "participants" || tabParam === "bracket" ? tabParam : "overview";
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
      initialTab={initialTab}
      participantOptions={detailData.participantOptions}
      participants={detailData.participants}
      permissions={detailData.permissions}
      rounds={detailData.rounds}
      runtimeState={detailData.runtimeState}
      viewerRegistration={detailData.viewerRegistration}
    />
  );
}
