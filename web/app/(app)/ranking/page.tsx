import Link from "next/link";
import { redirect } from "next/navigation";
import {
  countActivityRankingEntries,
  getActivityRankingViewerPosition,
  getDefaultActivityType,
  getProfileRanking,
  listActivityRankingPage,
} from "@/src/db/queries";
import { requireCurrentViewer } from "@/src/auth/current-viewer";

const RANKING_PAGE_SIZE = 20;

type RankingPageProps = {
  searchParams?: Promise<{
    page?: string | string[] | undefined;
  }>;
};

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
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

function buildRankingHref(page: number) {
  return page <= 1 ? "/ranking" : `/ranking?page=${page}`;
}

function formatPlace(place: number) {
  return String(place).padStart(2, "0");
}

function getWinRate(wins: number, matchesPlayed: number) {
  if (matchesPlayed <= 0) {
    return "0%";
  }

  return `${Math.round((wins / matchesPlayed) * 100)}%`;
}

type StatItemProps = {
  label: string;
  value: string;
};

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="space-y-0.5 text-center">
      <p className="text-[0.92rem] font-semibold leading-none text-slate-800">{value}</p>
      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  currentCount: number;
};

function PaginationControls({
  currentPage,
  totalPages,
  totalEntries,
  currentCount,
}: PaginationControlsProps) {
  if (totalEntries <= 0) {
    return null;
  }

  const rangeStart = (currentPage - 1) * RANKING_PAGE_SIZE + 1;
  const rangeEnd = rangeStart + currentCount - 1;

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.035)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[0.78rem] leading-5 text-slate-500">
        Показано {rangeStart}-{rangeEnd} из {totalEntries}
      </p>

      <nav aria-label="Пагинация рейтинга" className="flex items-center gap-2 self-start sm:self-auto">
        {currentPage > 1 ? (
          <Link
            href={buildRankingHref(currentPage - 1)}
            className="inline-flex min-h-7 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-2.5 text-[0.78rem] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Назад
          </Link>
        ) : (
          <span className="inline-flex min-h-7 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-2.5 text-[0.78rem] font-medium text-slate-400">
            Назад
          </span>
        )}

        <span className="inline-flex min-h-7 items-center justify-center rounded-[var(--radius-default)] bg-slate-100 px-2.5 text-[0.78rem] font-semibold text-slate-700">
          {currentPage} / {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Link
            href={buildRankingHref(currentPage + 1)}
            className="inline-flex min-h-7 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-2.5 text-[0.78rem] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Вперед
          </Link>
        ) : (
          <span className="inline-flex min-h-7 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-2.5 text-[0.78rem] font-medium text-slate-400">
            Вперед
          </span>
        )}
      </nav>
    </div>
  );
}

export default async function RankingPage({ searchParams }: RankingPageProps) {
  const viewer = await requireCurrentViewer();
  const params = searchParams ? await searchParams : {};
  const rawPage = getSingleSearchParam(params.page);
  const requestedPage = parsePositivePage(rawPage);

  if (rawPage !== undefined && requestedPage === null) {
    redirect("/ranking");
  }

  const activityType = await getDefaultActivityType();

  if (!activityType) {
    throw new Error("Default activity type is missing");
  }

  const totalEntries = await countActivityRankingEntries(activityType.id);
  const totalPages = Math.max(1, Math.ceil(totalEntries / RANKING_PAGE_SIZE));
  const currentPage = Math.min(requestedPage ?? 1, totalPages);

  if (rawPage !== undefined && currentPage !== (requestedPage ?? 1)) {
    redirect(buildRankingHref(currentPage));
  }

  const rankingOffset = (currentPage - 1) * RANKING_PAGE_SIZE;
  const [rankingEntries, viewerRanking, viewerPosition] = await Promise.all([
    listActivityRankingPage(
      activityType.id,
      {
        limit: RANKING_PAGE_SIZE,
        offset: rankingOffset,
      },
    ),
    getProfileRanking(viewer.profileId, activityType.id),
    getActivityRankingViewerPosition(activityType.id, viewer.profileId),
  ]);

  const isEmpty = rankingEntries.length === 0;
  const viewerRatingValue = viewerRanking ? String(viewerRanking.ranking.rating) : "—";
  const viewerPositionValue = viewerPosition ? `#${viewerPosition}` : "—";
  return (
    <div className="mx-auto w-full max-w-[1040px] min-w-0 overflow-x-hidden">
      <div className="space-y-2.5 md:mx-auto md:max-w-[860px] md:space-y-3">
        <header className="hidden md:block">
          <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950">
            Рейтинг
          </h1>
          <p className="mt-1 text-[0.86rem] leading-5 text-slate-500">
            Общая таблица участников по настольному теннису.
          </p>
        </header>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_175px] xl:items-start">
          <section className="min-w-0 space-y-2.5">
            {isEmpty ? (
              <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.035)] md:px-4.5 md:py-4.5">
                <h2 className="text-[1rem] font-semibold tracking-tight text-slate-800">
                  Рейтинг пока пуст
                </h2>
                <p className="mt-1 max-w-xl text-[0.84rem] leading-5 text-slate-500">
                  Когда появятся результаты матчей, здесь отобразится таблица участников.
                </p>
              </section>
            ) : (
              <>
                <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.035)] md:hidden">
                  <div className="relative grid grid-cols-2">
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-2.5 left-1/2 w-px -translate-x-1/2 bg-slate-200"
                    />
                    <div className="px-2.5 py-2.5 text-center">
                      <p className="text-[0.66rem] font-medium uppercase tracking-[0.08em] text-slate-500">
                        Elo
                      </p>
                      <p className="mt-1 text-[1.28rem] font-semibold leading-none tracking-tight text-slate-950">
                        {viewerRatingValue}
                      </p>
                    </div>

                    <div className="px-2.5 py-2.5">
                      <div className="text-center">
                        <p className="text-[0.66rem] font-medium text-slate-500">Место</p>
                        <p className="mt-1 text-[1.28rem] font-semibold leading-none tracking-tight text-blue-600">
                          {viewerPositionValue}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="hidden overflow-hidden rounded-[var(--radius-default)] border border-slate-200/90 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.035)] md:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="border-b border-slate-200/90 bg-slate-100">
                        <tr className="text-left">
                          <th className="w-14 px-3.5 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                            №
                          </th>
                          <th className="px-3.5 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                            Участник
                          </th>
                        <th className="w-20 px-3.5 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                          Рейтинг
                        </th>
                          <th className="w-20 px-3.5 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                            WIN RATE
                          </th>
                          <th className="w-20 px-3.5 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                            Матчи
                          </th>
                          <th className="w-20 px-3.5 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                            Победы
                          </th>
                          <th className="w-24 px-3.5 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                            Поражения
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankingEntries.map((entry, index) => {
                          const place = rankingOffset + index + 1;
                          const isViewer = entry.profile.id === viewer.profileId;
                          const winRate = getWinRate(
                            entry.ranking.wins,
                            entry.ranking.matchesPlayed,
                          );

                          return (
                            <tr
                              key={entry.ranking.id}
                              className={`border-t border-slate-100 ${
                                isViewer ? "bg-blue-50/30" : "bg-white"
                              }`}
                            >
                              <td className="px-3.5 py-2.5 text-[0.8rem] font-semibold text-slate-500">
                                {place}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-[0.84rem] font-semibold text-slate-800">
                                    {entry.profile.displayName}
                                  </span>
                                  {isViewer ? (
                                    <span className="inline-flex items-center rounded-[var(--radius-default)] bg-blue-100 px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.05em] text-blue-700">
                                      Вы
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 text-center text-[0.82rem] font-semibold text-blue-600">
                                {entry.ranking.rating}
                              </td>
                              <td className="px-3.5 py-2.5 text-center text-[0.8rem] text-slate-600">
                                {winRate}
                              </td>
                              <td className="px-3.5 py-2.5 text-center text-[0.8rem] text-slate-600">
                                {entry.ranking.matchesPlayed}
                              </td>
                              <td className="px-3.5 py-2.5 text-center text-[0.8rem] text-slate-600">
                                {entry.ranking.wins}
                              </td>
                              <td className="px-3.5 py-2.5 text-center text-[0.8rem] text-slate-600">
                                {entry.ranking.losses}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="space-y-1.5 md:hidden">
                  {rankingEntries.map((entry, index) => {
                    const place = rankingOffset + index + 1;
                    const isViewer = entry.profile.id === viewer.profileId;
                    const winRate = getWinRate(entry.ranking.wins, entry.ranking.matchesPlayed);

                    return (
                      <article
                        key={entry.ranking.id}
                        className={`rounded-[var(--radius-default)] border px-3 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.035)] ${
                          isViewer
                            ? "border-blue-100 bg-blue-50/30"
                            : "border-slate-200/80 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <div className="w-7 shrink-0 text-[0.85rem] font-semibold leading-5 text-slate-400">
                              {formatPlace(place)}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1">
                                <h2 className="truncate text-[0.84rem] font-semibold leading-5 text-slate-800">
                                  {entry.profile.displayName}
                                </h2>
                                {isViewer ? (
                                  <span className="inline-flex items-center rounded-[var(--radius-default)] bg-blue-100 px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.05em] text-blue-700">
                                    Вы
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
                              Рейтинг
                            </p>
                            <p className="mt-0.5 text-[0.9rem] font-semibold leading-none text-blue-600">
                              {entry.ranking.rating}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-4 gap-2 border-t border-slate-100 pt-2">
                          <StatItem label="WIN RATE" value={winRate} />
                          <StatItem label="Матчи" value={String(entry.ranking.matchesPlayed)} />
                          <StatItem label="Победы" value={String(entry.ranking.wins)} />
                          <StatItem label="Поражения" value={String(entry.ranking.losses)} />
                        </div>
                      </article>
                    );
                  })}
                </div>

                <PaginationControls
                  currentCount={rankingEntries.length}
                  currentPage={currentPage}
                  totalEntries={totalEntries}
                  totalPages={totalPages}
                />
              </>
            )}
          </section>

          <aside className="hidden min-w-0 space-y-2 md:block">
            <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.035)]">
              <div className="relative grid grid-cols-2">
                <div
                  aria-hidden="true"
                  className="absolute inset-y-2.5 left-1/2 w-px -translate-x-1/2 bg-slate-200"
                />
                <div className="px-2.5 py-2.5 text-center">
                  <p className="text-[0.66rem] font-medium uppercase tracking-[0.08em] text-slate-500">
                    Elo
                  </p>
                  <p className="mt-1 text-[0.96rem] font-semibold leading-none tracking-tight text-slate-950">
                    {viewerRatingValue}
                  </p>
                </div>

                <div className="px-2.5 py-2.5">
                  <div className="text-center">
                    <p className="text-[0.66rem] font-medium text-slate-500">Место</p>
                    <p className="mt-1 text-[0.96rem] font-semibold leading-none tracking-tight text-blue-600">
                      {viewerPositionValue}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[var(--radius-default)] border border-blue-200/90 bg-blue-50/80 px-2.5 py-2.5 shadow-[0_8px_20px_rgba(59,130,246,0.06)] md:px-3 md:py-3">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-blue-700">
                О системе рейтинга
              </p>
              <p className="mt-1 text-[0.74rem] leading-5 text-slate-600">
                Рейтинг рассчитывается на основе алгоритма Elo. Учитывается сила противника и
                история ваших последних матчей.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
