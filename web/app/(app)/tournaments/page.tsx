import { requireCurrentViewer } from "@/src/auth/current-viewer";
import {
  getDefaultActivityType,
  getTournamentActionItemsForCompetitions,
  listCompetitionsByActivity,
  listCompetitionsByOwner,
  listCompetitionsVisibleToOrganizerAll,
  listProfileCompetitions,
} from "@/src/db/queries";
import { resolveTournamentRuntimeState } from "@/src/tournaments/runtime-state";
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
type TournamentTab = "all" | "archive" | "my" | "participating";

type TournamentsPageProps = {
  searchParams?: Promise<{
    create?: string | string[] | undefined;
    tab?: string | string[] | undefined;
  }>;
};

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseTournamentTab(value: string | undefined, isManager: boolean): TournamentTab {
  if (!value) {
    return isManager ? "my" : "all";
  }

  if (value === "all") {
    return "all";
  }

  if (value === "archive") {
    return "archive";
  }

  if (value === "participating") {
    return "participating";
  }

  if (value === "my" && isManager) {
    return "my";
  }

  return isManager ? "my" : "all";
}

function buildTournamentsHref(
  activeTab: TournamentTab,
  options?: {
    create?: boolean;
  },
) {
  const params = new URLSearchParams();

  params.set("tab", activeTab);

  if (options?.create) {
    params.set("create", "1");
  }

  const query = params.toString();

  return query ? `/tournaments?${query}` : "/tournaments";
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
  return [...entries].sort(compareScheduledCompetitions);
}

function toListEntry(
  entry: CompetitionListEntry,
  viewerCompetitionIds: Set<string>,
) {
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
}

function isArchiveCompetition(entry: CompetitionListEntry) {
  return entry.competition.status === "completed" || entry.competition.status === "cancelled";
}

function isActiveCompetition(entry: CompetitionListEntry) {
  return !isArchiveCompetition(entry) && entry.competition.status !== "draft";
}

export default async function TournamentsPage({ searchParams }: TournamentsPageProps) {
  const viewer = await requireCurrentViewer();
  const params = (await searchParams) ?? {};
  const activityType = await getDefaultActivityType();

  if (!activityType) {
    throw new Error("Default activity type is missing");
  }

  const isManager = viewer.role === "organizer" || viewer.role === "admin";
  const isAdmin = viewer.role === "admin";
  const isOrganizer = viewer.role === "organizer";
  const activeTab = parseTournamentTab(getSingleSearchParam(params.tab), isManager);
  const createSheetOpen = isManager && getSingleSearchParam(params.create) === "1";

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
  const sortedParticipatingCompetitions = sortCompetitions(viewerCompetitions);
  const viewerCompetitionIds = new Set(
    sortedParticipatingCompetitions.map((entry) => entry.competition.id),
  );

  const activeCompetitions = sortedAllCompetitions.filter(isActiveCompetition);
  const archiveCompetitions = sortedAllCompetitions.filter(isArchiveCompetition);
  const activeParticipatingCompetitions = sortedParticipatingCompetitions.filter(isActiveCompetition);
  const actionSourceCompetitions = isAdmin ? activeCompetitions : sortedMyCompetitions;
  const managementEntries = isManager
    ? await getTournamentActionItemsForCompetitions(actionSourceCompetitions)
    : [];

  return (
    <div className="mx-auto w-full max-w-[860px] min-w-0 overflow-x-hidden px-0">
      <div className="space-y-5">
        <header className="hidden items-start gap-4 md:flex">
          <div>
            <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950">Турниры</h1>
          </div>
        </header>

        <TournamentsListSection
          activeTab={activeTab}
          allEntries={activeCompetitions.map((entry) => toListEntry(entry, viewerCompetitionIds))}
          archiveEntries={archiveCompetitions.map((entry) =>
            toListEntry(entry, viewerCompetitionIds),
          )}
          createHref={buildTournamentsHref(activeTab, { create: true })}
          hasAnyVisibleCompetitions={
            sortedAllCompetitions.length > 0 ||
            sortedMyCompetitions.length > 0 ||
            sortedParticipatingCompetitions.length > 0
          }
          isManager={isManager}
          managementEntries={managementEntries}
          myArchiveEntries={sortedMyCompetitions
            .filter(isArchiveCompetition)
            .map((entry) => toListEntry(entry, viewerCompetitionIds))}
          myEntries={sortedMyCompetitions
            .filter((entry) => !isArchiveCompetition(entry))
            .map((entry) => toListEntry(entry, viewerCompetitionIds))}
          participatingEntries={activeParticipatingCompetitions.map((entry) =>
            toListEntry(entry, viewerCompetitionIds),
          )}
        />

        {isManager ? (
          <CreateTournamentSheet
            closeHref={buildTournamentsHref(activeTab)}
            isOpen={createSheetOpen}
          />
        ) : null}
      </div>
    </div>
  );
}
