import { redirect } from "next/navigation";
import { requireCurrentViewer } from "@/src/auth/current-viewer";
import {
  getDefaultActivityType,
  listCompetitionsByActivity,
  listCompetitionsByOwner,
  listProfileCompetitions,
  listCompetitionsVisibleToOrganizerAll,
} from "@/src/db/queries";
import {
  resolveTournamentRuntimeState,
  type TournamentStatus,
} from "@/src/tournaments/runtime-state";
import { CreateTournamentSheet } from "./_components/create-tournament-sheet";
import { TournamentsListSection } from "./_components/tournaments-list-section";

const ADMIN_VISIBLE_STATUSES = [
  "draft",
  "registration",
  "ready",
  "in_progress",
  "completed",
  "cancelled",
] as const;
const PLAYER_VISIBLE_STATUSES = [
  "registration",
  "ready",
  "in_progress",
  "completed",
  "cancelled",
] as const;

type CompetitionListEntry = Awaited<ReturnType<typeof listCompetitionsByActivity>>[number];

type TournamentTab = "my" | "all";

type TournamentsPageProps = {
  searchParams?: Promise<{
    create?: string | string[] | undefined;
    page?: string | string[] | undefined;
    tab?: string | string[] | undefined;
  }>;
};

type TournamentsSearchParams = {
  create?: string | string[] | undefined;
  page?: string | string[] | undefined;
  tab?: string | string[] | undefined;
};

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseTournamentTab(value: string | undefined): TournamentTab {
  return value === "all" ? "all" : "my";
}

function parsePositivePage(value: string | undefined) {
  if (value === undefined) {
    return 1;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    return null;
  }

  return parsedValue;
}

function buildListHref(activeTab: TournamentTab, page: number) {
  return buildTournamentsHref(activeTab, page);
}

function buildTournamentsHref(
  activeTab: TournamentTab,
  page: number,
  options?: {
    create?: boolean;
  },
) {
  const params = new URLSearchParams();

  params.set("tab", activeTab);

  if (page > 1) {
    params.set("page", String(page));
  }

  if (options?.create) {
    params.set("create", "1");
  }

  const query = params.toString();

  return query ? `/tournaments?${query}` : "/tournaments";
}

function getCompetitionStatusOrder(status: TournamentStatus) {
  switch (status) {
    case "draft":
      return 0;
    case "in_progress":
      return 1;
    case "ready":
      return 2;
    case "registration":
      return 3;
    case "completed":
      return 4;
    case "cancelled":
      return 5;
  }
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

function compareDescDates(left: Date | null, right: Date | null) {
  const leftTimestamp = left?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rightTimestamp = right?.getTime() ?? Number.NEGATIVE_INFINITY;

  return rightTimestamp - leftTimestamp;
}

function compareScheduledCompetitions(left: CompetitionListEntry, right: CompetitionListEntry) {
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

function sortCompetitions(entries: CompetitionListEntry[]) {
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
    const statusOrderDifference =
      getCompetitionStatusOrder(leftRuntimeState.effectiveStatus) -
      getCompetitionStatusOrder(rightRuntimeState.effectiveStatus);

    if (statusOrderDifference !== 0) {
      return statusOrderDifference;
    }

    switch (leftRuntimeState.effectiveStatus) {
      case "draft":
      case "registration":
      case "ready":
      case "in_progress":
        return compareScheduledCompetitions(left, right);
      case "completed": {
        const completionComparison = compareDescDates(
          left.competition.completedAt ?? left.competition.updatedAt,
          right.competition.completedAt ?? right.competition.updatedAt,
        );

        if (completionComparison !== 0) {
          return completionComparison;
        }

        return compareDescDates(left.competition.createdAt, right.competition.createdAt);
      }
      case "cancelled": {
        const updatedAtComparison = compareDescDates(
          left.competition.updatedAt,
          right.competition.updatedAt,
        );

        if (updatedAtComparison !== 0) {
          return updatedAtComparison;
        }

        return compareDescDates(left.competition.createdAt, right.competition.createdAt);
      }
    }
  });
}

export default async function TournamentsPage({ searchParams }: TournamentsPageProps) {
  const viewer = await requireCurrentViewer();
  const params: TournamentsSearchParams = (await searchParams) ?? {};
  const activityType = await getDefaultActivityType();

  if (!activityType) {
    throw new Error("Default activity type is missing");
  }

  const isManager = viewer.role === "organizer" || viewer.role === "admin";
  const isAdmin = viewer.role === "admin";
  const isOrganizer = viewer.role === "organizer";
  const activeTab = isManager ? parseTournamentTab(getSingleSearchParam(params.tab)) : "all";
  const requestedPage = parsePositivePage(getSingleSearchParam(params.page));
  const createSheetOpen = getSingleSearchParam(params.create) === "1";

  if (getSingleSearchParam(params.page) !== undefined && requestedPage === null) {
    redirect(buildListHref(activeTab, 1));
  }

  const [allCompetitions, myCompetitions, viewerCompetitions] = await Promise.all([
    isAdmin
      ? listCompetitionsByActivity(
          activityType.id,
          {
            statuses: [...ADMIN_VISIBLE_STATUSES],
          },
        )
      : isOrganizer
        ? listCompetitionsVisibleToOrganizerAll(viewer.profileId, activityType.id)
        : listCompetitionsByActivity(
            activityType.id,
            {
              statuses: [...PLAYER_VISIBLE_STATUSES],
            },
          ),
    isManager
      ? listCompetitionsByOwner(
          viewer.profileId,
          activityType.id,
          { statuses: [...ADMIN_VISIBLE_STATUSES] },
        )
      : Promise.resolve([]),
    listProfileCompetitions(viewer.profileId, activityType.id),
  ]);
  const sortedAllCompetitions = sortCompetitions(allCompetitions);
  const sortedMyCompetitions = sortCompetitions(myCompetitions);
  const viewerCompetitionIds = new Set(
    viewerCompetitions.map((entry) => entry.competition.id),
  );

  const selectedCompetitions =
    isManager && activeTab === "my" ? sortedMyCompetitions : sortedAllCompetitions;
  const hasAnyVisibleCompetitions = sortedAllCompetitions.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1040px] min-w-0 overflow-x-hidden">
      <div className="mx-auto w-full max-w-[860px] space-y-4">
        <header className="hidden items-start gap-4 md:flex">
          <div>
            <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950">Турниры</h1>
          </div>
        </header>

        <TournamentsListSection
          activeTab={activeTab}
          entries={selectedCompetitions.map((entry) => {
            const runtimeState = resolveTournamentRuntimeState({
              hasBracket: entry.matchesCount > 0,
              scheduledAt: entry.competition.scheduledAt,
              status: entry.competition.status as TournamentStatus,
            });

            return {
              hasBracket: entry.matchesCount > 0,
              id: entry.competition.id,
              isViewerParticipant: viewerCompetitionIds.has(entry.competition.id),
              matchFormat: entry.competition.matchFormat,
              participantsCount: entry.participantsCount,
              runtimeState,
              scheduledAt: entry.competition.scheduledAt
                ? entry.competition.scheduledAt.toISOString()
                : null,
              title: entry.competition.title,
            };
          })}
          hasAnyVisibleCompetitions={hasAnyVisibleCompetitions}
          isManager={isManager}
        />

        {isManager ? (
          <CreateTournamentSheet
            closeHref={buildListHref(activeTab, requestedPage ?? 1)}
            isOpen={createSheetOpen}
          />
        ) : null}
      </div>
    </div>
  );
}
