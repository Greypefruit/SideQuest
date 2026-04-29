import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentViewer } from "@/src/auth/current-viewer";
import {
  getDefaultActivityType,
  listCompetitionsByActivity,
  listCompetitionsByOwner,
  listCompetitionsVisibleToOrganizerAll,
} from "@/src/db/queries";
import { CreateTournamentSheetInner } from "./_components/create-tournament-sheet";
import { TournamentDetailSheet } from "./_components/tournament-detail-sheet";
import { getTournamentDetailData } from "./detail-data";

const ADMIN_VISIBLE_STATUSES = ["draft", "in_progress", "completed"] as const;
const PLAYER_VISIBLE_STATUSES = ["in_progress", "completed"] as const;
const TOURNAMENTS_PAGE_SIZE = 6;

type TournamentTab = "my" | "all";

type TournamentsPageProps = {
  searchParams?: Promise<{
    competition?: string | string[] | undefined;
    create?: string | string[] | undefined;
    page?: string | string[] | undefined;
    tab?: string | string[] | undefined;
  }>;
};

type TournamentsSearchParams = {
  competition?: string | string[] | undefined;
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

function isCreateSheetOpen(value: string | undefined) {
  return value === "1";
}

function buildCreateHref(activeTab: TournamentTab, page: number) {
  return buildTournamentsHref(activeTab, page, { create: true });
}

function buildCompetitionHref(activeTab: TournamentTab, page: number, competitionId: string) {
  return buildTournamentsHref(activeTab, page, { competitionId });
}

function buildListHref(activeTab: TournamentTab, page: number) {
  return buildTournamentsHref(activeTab, page);
}

function buildTournamentsHref(
  activeTab: TournamentTab,
  page: number,
  options?: {
    competitionId?: string;
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

  if (options?.competitionId) {
    params.set("competition", options.competitionId);
  }

  const query = params.toString();

  return query ? `/tournaments?${query}` : "/tournaments";
}

function formatParticipantsLabel(count: number) {
  const normalized = Math.abs(count) % 100;
  const lastDigit = normalized % 10;

  if (normalized >= 11 && normalized <= 19) {
    return `${count} участников`;
  }

  if (lastDigit === 1) {
    return `${count} участник`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} участника`;
  }

  return `${count} участников`;
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

type PaginationProps = {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
  activeTab: TournamentTab;
};

function Pagination({
  currentPage,
  totalItems,
  totalPages,
  pageSize,
  activeTab,
}: PaginationProps) {
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-3 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center sm:justify-between md:px-3 md:py-2">
      <p className="self-start text-[0.78rem] leading-5 text-slate-500 md:self-auto">
        Показано {rangeStart}-{rangeEnd} из {totalItems}
      </p>

      <nav aria-label="Пагинация турниров" className="flex items-center justify-center gap-2">
        {currentPage > 1 ? (
          <Link
            className="inline-flex min-h-8 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-3 text-[0.78rem] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href={buildTournamentsHref(activeTab, currentPage - 1)}
          >
            Назад
          </Link>
        ) : (
          <span className="inline-flex min-h-8 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3 text-[0.78rem] font-medium text-slate-400">
            Назад
          </span>
        )}

        <span className="inline-flex min-h-8 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-slate-100 px-3 text-[0.78rem] font-semibold text-slate-700">
          {currentPage} / {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Link
            className="inline-flex min-h-8 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-3 text-[0.78rem] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href={buildTournamentsHref(activeTab, currentPage + 1)}
          >
            Вперед
          </Link>
        ) : (
          <span className="inline-flex min-h-8 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3 text-[0.78rem] font-medium text-slate-400">
            Вперед
          </span>
        )}
      </nav>
    </div>
  );
}

function getStatusUi(status: "draft" | "in_progress" | "completed") {
  switch (status) {
    case "draft":
      return {
        label: "ЧЕРНОВИК",
        className: "border border-slate-300 bg-slate-100 text-slate-600",
      };
    case "in_progress":
      return {
        label: "ИДЕТ",
        className: "bg-blue-50 text-blue-700",
      };
    case "completed":
      return {
        label: "ЗАВЕРШЕН",
        className: "bg-slate-200 text-slate-700",
      };
  }
}

function formatTournamentScheduledAt(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const scheduledAt = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  const day = String(scheduledAt.getDate()).padStart(2, "0");
  const month = String(scheduledAt.getMonth() + 1).padStart(2, "0");
  const year = String(scheduledAt.getFullYear()).slice(-2);
  const hours = String(scheduledAt.getHours()).padStart(2, "0");
  const minutes = String(scheduledAt.getMinutes()).padStart(2, "0");

  const datePart = `${day}.${month}.${year}`;
  const timePart = `${hours}:${minutes}`;

  if (hours === "00" && minutes === "00") {
    return datePart;
  }

  return `${datePart} · ${timePart}`;
}

type TournamentCardProps = {
  desktopHref: string;
  mobileHref: string;
  title: string;
  matchFormat: "BO1" | "BO3" | "BO5";
  participantsCount: number;
  scheduledAt?: string | Date | null;
  status: "draft" | "in_progress" | "completed";
};

function TournamentCard({
  desktopHref,
  mobileHref,
  title,
  matchFormat,
  participantsCount,
  scheduledAt,
  status,
}: TournamentCardProps) {
  const statusUi = getStatusUi(status);
  const scheduledAtText = formatTournamentScheduledAt(scheduledAt);

  return (
    <article className="relative rounded-[var(--radius-default)] border border-[#D9E2F0] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition-[background-color,border-color,transform] duration-150 ease-out hover:-translate-y-px hover:border-blue-200 hover:bg-blue-50 active:border-blue-300 active:bg-blue-100">
      <Link
        aria-label={`Открыть турнир «${title}»`}
        className="absolute inset-0 z-10 md:hidden"
        href={mobileHref}
      />
      <Link
        aria-label={`Открыть турнир «${title}»`}
        className="absolute inset-0 z-10 hidden md:block"
        href={desktopHref}
      />

      <div className="flex items-start justify-between gap-4 md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <h2 className="max-w-[34rem] text-[1.05rem] font-semibold leading-6 tracking-tight text-slate-900 md:text-[1.15rem]">
              {title}
            </h2>
          </div>

          <p className="mt-2 text-[0.9rem] leading-6 text-slate-500">
            Настольный теннис · На выбывание · {matchFormat}
          </p>

          <div className="mt-3 flex items-center gap-4">
            <p className="inline-flex items-center gap-1.5 text-[0.84rem] font-medium text-slate-500">
              <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
                <path
                  d="M5.333 6.333a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM10.667 7.667a1.667 1.667 0 1 0 0-3.334 1.667 1.667 0 0 0 0 3.334ZM2.667 12.667v-.334c0-1.472 1.194-2.666 2.666-2.666h.667c1.473 0 2.667 1.194 2.667 2.666v.334M9 12.667v-.334c0-1.104.895-2 2-2h.333c1.105 0 2 .896 2 2v.334"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
              </svg>
              {formatParticipantsLabel(participantsCount)}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-stretch">
          <div className="flex h-full min-w-[8rem] flex-col items-end justify-between gap-3 md:min-w-[8.5rem]">
            {scheduledAtText ? (
              <p className="whitespace-nowrap text-right text-[0.88rem] font-medium leading-5 text-slate-700 md:text-[0.9rem]">
                {scheduledAtText}
              </p>
            ) : (
              <span aria-hidden="true" />
            )}

            <span
              className={`inline-flex min-h-5.5 items-center rounded-[var(--radius-default)] px-2.5 text-[0.56rem] font-semibold tracking-[0.08em] ${statusUi.className}`}
            >
              {statusUi.label}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  showCreateButton: boolean;
  variant: "manager" | "player";
  createHref: string;
};

function EmptyState({
  title,
  description,
  showCreateButton,
  variant,
  createHref,
}: EmptyStateProps) {
  const isPlayer = variant === "player";

  return (
    <section
      className={`rounded-[var(--radius-default)] border border-slate-200/90 bg-white text-center shadow-[0_12px_28px_rgba(15,23,42,0.03)] ${
        isPlayer ? "px-6 py-9 md:px-8 md:py-10" : "px-6 py-8 md:px-8 md:py-9"
      }`}
    >
      <div
        className={`mx-auto flex flex-col items-center justify-center ${
          isPlayer ? "max-w-[22rem] gap-2.5" : "max-w-[24rem] gap-2"
        }`}
      >
        <h2
          className={`font-semibold tracking-tight text-slate-800 ${
            isPlayer
              ? "text-[1.1rem] leading-6 md:text-[1.15rem]"
              : "text-[0.95rem] leading-5 md:text-[1rem]"
          }`}
        >
          {title}
        </h2>
        <p
          className={`text-slate-500 ${
            isPlayer
              ? "text-[0.88rem] leading-6 md:text-[0.9rem]"
              : "text-[0.84rem] leading-5 md:text-[0.86rem]"
          }`}
        >
          {description}
        </p>

        {showCreateButton ? (
          <div className="mt-3">
            <Link
              href={createHref}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 md:min-h-10 md:w-auto md:min-w-[170px] md:px-4 md:text-[0.86rem]"
            >
              <PlusIcon />
              Создать турнир
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type ScopedEmptyStateProps = {
  activeTab: TournamentTab;
};

function ScopedEmptyState({ activeTab }: ScopedEmptyStateProps) {
  return (
    <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-5 py-7 text-center shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
      <div className="mx-auto flex max-w-[26rem] flex-col items-center justify-center">
        <h2 className="text-[1rem] font-semibold tracking-tight text-slate-800">
          {activeTab === "my" ? "У вас пока нет турниров" : "Список турниров пока пуст"}
        </h2>
        <p className="mt-1 whitespace-nowrap text-[0.9rem] leading-6 text-slate-500">
          {activeTab === "my"
            ? "Создайте первый турнир, чтобы он появился в разделе «Мои»."
            : "Когда в системе появятся турниры, они будут отображаться здесь."}
        </p>
      </div>
    </section>
  );
}

type TabLinkProps = {
  href: string;
  label: string;
  active: boolean;
};

function TabLink({ href, label, active }: TabLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center rounded-[var(--radius-default)] px-3.5 text-[0.92rem] font-semibold transition md:min-h-10 md:px-3 md:text-[0.86rem] ${
        active
          ? "bg-blue-500 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
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
  const selectedCompetitionId = getSingleSearchParam(params.competition);
  const closeDetailHref = buildListHref(activeTab, requestedPage ?? 1);
  const detailData = selectedCompetitionId
    ? await getTournamentDetailData(viewer, selectedCompetitionId)
    : null;
  const createSheetOpen =
    isManager &&
    !selectedCompetitionId &&
    isCreateSheetOpen(getSingleSearchParam(params.create));

  if (getSingleSearchParam(params.page) !== undefined && requestedPage === null) {
    redirect(buildListHref(activeTab, 1));
  }

  if (selectedCompetitionId && !detailData) {
    redirect(closeDetailHref);
  }

  const [allCompetitions, myCompetitions] = await Promise.all([
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
  ]);

  const selectedCompetitions = isManager && activeTab === "my" ? myCompetitions : allCompetitions;
  const hasAnyVisibleCompetitions = allCompetitions.length > 0;
  const totalPages = Math.max(
    1,
    Math.ceil(selectedCompetitions.length / TOURNAMENTS_PAGE_SIZE),
  );
  const currentPage = Math.min(requestedPage ?? 1, totalPages);
  const createHref = buildCreateHref(activeTab, currentPage);
  const closeCreateHref = buildListHref(activeTab, currentPage);

  if (
    selectedCompetitions.length > 0 &&
    getSingleSearchParam(params.page) !== undefined &&
    currentPage !== (requestedPage ?? 1)
  ) {
    redirect(buildTournamentsHref(activeTab, currentPage));
  }

  const pageStartIndex = (currentPage - 1) * TOURNAMENTS_PAGE_SIZE;
  const currentCompetitions = selectedCompetitions.slice(
    pageStartIndex,
    pageStartIndex + TOURNAMENTS_PAGE_SIZE,
  );

  return (
    <div className="mx-auto w-full max-w-[1040px] min-w-0 overflow-x-hidden">
      <div className="mx-auto w-full max-w-[860px] space-y-4">
        <header className="hidden items-start gap-4 md:flex">
          <div>
            <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950">Турниры</h1>
          </div>
        </header>

        {!hasAnyVisibleCompetitions ? (
          isManager ? (
            <EmptyState
              description="Создайте первый турнир, чтобы начать работу."
              showCreateButton
              title="Пока нет турниров"
              variant="manager"
              createHref={createHref}
            />
          ) : (
            <EmptyState
              description="Когда появятся новые турниры, они будут отображаться здесь."
              showCreateButton={false}
              title="Пока нет доступных турниров"
              variant="player"
              createHref={createHref}
            />
          )
        ) : (
          <div className="space-y-3">
            {isManager ? (
              <>
                <div className="hidden items-center justify-between gap-4 md:flex">
                  <nav aria-label="Фильтр турниров" className="flex items-center gap-2">
                    <TabLink active={activeTab === "my"} href="/tournaments?tab=my" label="Мои" />
                    <TabLink active={activeTab === "all"} href="/tournaments?tab=all" label="Все" />
                  </nav>

                  <Link
                    href={createHref}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.86rem] font-semibold text-white transition hover:bg-blue-600"
                  >
                    <PlusIcon />
                    Создать турнир
                  </Link>
                </div>

                <div className="space-y-3 md:hidden">
                  <nav aria-label="Фильтр турниров" className="flex items-center gap-2">
                    <TabLink active={activeTab === "my"} href="/tournaments?tab=my" label="Мои" />
                    <TabLink active={activeTab === "all"} href="/tournaments?tab=all" label="Все" />
                  </nav>

                  <Link
                    href={createHref}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600"
                  >
                    <PlusIcon />
                    Создать турнир
                  </Link>
                </div>
              </>
            ) : null}

            {selectedCompetitions.length === 0 ? (
              <ScopedEmptyState activeTab={activeTab} />
            ) : (
              <>
                <section className="space-y-3">
                  {currentCompetitions.map((entry) => (
                    <TournamentCard
                      key={entry.competition.id}
                      desktopHref={buildCompetitionHref(
                        activeTab,
                        currentPage,
                        entry.competition.id,
                      )}
                      matchFormat={entry.competition.matchFormat}
                      mobileHref={`/tournaments/${entry.competition.id}`}
                      participantsCount={entry.participantsCount}
                      scheduledAt={entry.competition.scheduledAt}
                      status={entry.competition.status as "draft" | "in_progress" | "completed"}
                      title={entry.competition.title}
                    />
                  ))}
                </section>

                {selectedCompetitions.length > 0 ? (
                  <Pagination
                    activeTab={activeTab}
                    currentPage={currentPage}
                    pageSize={TOURNAMENTS_PAGE_SIZE}
                    totalItems={selectedCompetitions.length}
                    totalPages={totalPages}
                  />
                ) : null}
              </>
            )}
          </div>
        )}
      </div>

      {createSheetOpen ? <CreateTournamentSheetInner closeHref={closeCreateHref} /> : null}
      {detailData ? (
        <TournamentDetailSheet
          bracket={detailData.bracket}
          canManageDraft={detailData.canManageDraft}
          closeHref={buildListHref(activeTab, currentPage)}
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
          presentation="modal"
          viewer={viewer}
        />
      ) : null}
    </div>
  );
}
