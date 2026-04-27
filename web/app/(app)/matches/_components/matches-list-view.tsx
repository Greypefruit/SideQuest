"use client";

import { useDeferredValue, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AuthenticatedViewer } from "@/src/auth/current-viewer";
import { createCompletedMatchAction } from "../actions";
import {
  CreateMatchSheet,
  type CreateMatchPayload,
  type OpponentOption,
} from "./create-match-sheet";

type MatchFormat = "BO1" | "BO3" | "BO5";

type MatchScore = {
  player1: number;
  player2: number;
};

type MatchItem = {
  id: string;
  createdAt: string;
  player1: string;
  player2: string;
  format: MatchFormat;
  score: MatchScore;
};

type MatchesListViewProps = {
  initialMatches: MatchItem[];
  opponentOptions: OpponentOption[];
  viewer: AuthenticatedViewer;
};

const MATCHES_PAGE_SIZE = 6;

const FULL_NAME_BY_SHORT_NAME: Record<string, string> = {
  "Иванов А.": "Алексей Иванов",
  "Котов М.": "Михаил Котов",
  "Ларин Д.": "Дмитрий Ларин",
  "Волков С.": "Сергей Волков",
  "Попов Е.": "Егор Попов",
  "Соколов К.": "Константин Соколов",
  "Лебедев И.": "Илья Лебедев",
  "Фомин Р.": "Роман Фомин",
  "Киселев Н.": "Никита Киселев",
  "Громов П.": "Павел Громов",
};

const FORMAT_CHIP_CLASS =
  "inline-flex min-h-6 items-center rounded-[var(--radius-default)] border border-slate-200 bg-slate-100 px-2.5 text-[0.7rem] font-semibold text-slate-600";

function formatMatchCreatedAt(isoDateTime: string) {
  const date = new Date(isoDateTime);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}.${month}.${year}`;
}

function getWinnerScore(match: MatchItem) {
  return match.score.player1 > match.score.player2
    ? {
        winner: match.score.player1,
        loser: match.score.player2,
      }
    : {
        winner: match.score.player2,
        loser: match.score.player1,
      };
}

function getWinnerScoreText(match: MatchItem) {
  const score = getWinnerScore(match);
  return `${score.winner}:${score.loser}`;
}

function getWinnerName(match: MatchItem) {
  return match.score.player1 > match.score.player2 ? match.player1 : match.player2;
}

function getLoserName(match: MatchItem) {
  return match.score.player1 > match.score.player2 ? match.player2 : match.player1;
}

function getFullPlayerName(name: string) {
  return FULL_NAME_BY_SHORT_NAME[name] ?? name;
}

function getMobilePlayerName(name: string) {
  const fullName = getFullPlayerName(name).trim();
  const [firstName, lastName, ...rest] = fullName.split(/\s+/);

  if (!firstName || !lastName || rest.length > 0) {
    return name;
  }

  const initial = firstName.charAt(0).toUpperCase();

  return initial ? `${lastName} ${initial}.` : lastName;
}

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

function SearchField({ value, onChange }: SearchFieldProps) {
  return (
    <label className="relative block w-full md:max-w-[280px]">
      <span className="sr-only">Поиск по игроку</span>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <SearchIcon />
      </span>
      <input
        className="min-h-10.5 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white pl-10 pr-3 text-[0.9rem] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:min-h-10"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Поиск по игроку"
        type="search"
        value={value}
      />
    </label>
  );
}

function EmptyMatchesState() {
  return (
    <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-7 text-center shadow-[0_10px_24px_rgba(15,23,42,0.03)] md:px-5 md:py-8">
      <h2 className="text-[1rem] font-semibold tracking-tight text-slate-800">
        Матчей пока нет
      </h2>
      <p className="mt-1 text-[0.84rem] leading-5 text-slate-500">
        Добавьте первую завершенную запись, чтобы список матчей появился здесь.
      </p>
    </section>
  );
}

type PaginationProps = {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

function Pagination({ currentPage, totalItems, totalPages, pageSize, onPageChange }: PaginationProps) {
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-3 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center sm:justify-between md:px-3 md:py-2">
      <p className="self-start text-[0.78rem] leading-5 text-slate-500 md:self-auto">
        Показано {rangeStart}-{rangeEnd} из {totalItems}
      </p>

      <nav aria-label="Пагинация матчей" className="flex items-center justify-center gap-2">
        <button
          className="inline-flex min-h-8 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-3 text-[0.78rem] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-400"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Назад
        </button>

        <span className="inline-flex min-h-8 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-slate-100 px-3 text-[0.78rem] font-semibold text-slate-700">
          {currentPage} / {totalPages}
        </span>

        <button
          className="inline-flex min-h-8 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-3 text-[0.78rem] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-400"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Вперед
        </button>
      </nav>
    </div>
  );
}

type DesktopMatchesTableProps = {
  matches: MatchItem[];
};

function DesktopMatchesTable({ matches }: DesktopMatchesTableProps) {
  return (
    <section className="hidden overflow-hidden rounded-[var(--radius-default)] border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.03)] md:block">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[124px]" />
            <col className="w-[230px]" />
            <col />
            <col className="w-[112px]" />
            <col className="w-[96px]" />
          </colgroup>
          <thead className="border-b border-slate-200/90 bg-slate-100">
            <tr className="text-left">
              <th className="px-5 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                Дата
              </th>
              <th className="px-5 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                Победитель
              </th>
              <th className="px-5 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                Проигравший
              </th>
              <th className="px-4 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                Формат
              </th>
              <th className="px-5 py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                Счет
              </th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id} className="border-t border-slate-100 first:border-t-0">
                <td className="whitespace-nowrap px-5 py-3.5 align-middle text-[0.84rem] font-medium text-slate-700">
                  {formatMatchCreatedAt(match.createdAt)}
                </td>
                <td className="px-5 py-3.5 align-middle">
                  <span className="block truncate text-[0.92rem] font-medium text-slate-800">
                    {getFullPlayerName(getWinnerName(match))}
                  </span>
                </td>
                <td className="px-5 py-3.5 align-middle">
                  <span className="block truncate text-[0.92rem] font-medium text-slate-700">
                    {getFullPlayerName(getLoserName(match))}
                  </span>
                </td>
                <td className="px-4 py-3.5 align-middle">
                  <span className={FORMAT_CHIP_CLASS}>{match.format}</span>
                </td>
                <td className="px-4 py-3.5 align-middle">
                  <span className="inline-flex min-h-7 items-center rounded-[var(--radius-default)] border border-slate-200 bg-slate-100 px-2.5 text-[0.84rem] font-semibold text-slate-700">
                    {getWinnerScoreText(match)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type MobileMatchesCardsProps = {
  matches: MatchItem[];
};

function MobileMatchesCards({ matches }: MobileMatchesCardsProps) {
  return (
    <section className="space-y-2.5 md:hidden">
      {matches.map((match) => (
        <article
          key={match.id}
          className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[0.84rem] font-medium tracking-tight text-slate-700">
              {formatMatchCreatedAt(match.createdAt)}
            </p>

            <span className={FORMAT_CHIP_CLASS}>{match.format}</span>
          </div>

          <div className="mt-3.5 grid min-h-[5rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
            <p className="min-w-0 text-right text-[1rem] font-medium text-slate-800">
              <span className="block truncate">{getMobilePlayerName(getWinnerName(match))}</span>
            </p>

            <div className="min-w-[4.5rem] text-center">
              <div className="flex items-baseline justify-center gap-1 text-[1.68rem] font-semibold leading-none tracking-tight text-slate-800">
                <span>
                  {getWinnerScore(match).winner}
                </span>
                <span className="text-slate-800">:</span>
                <span>
                  {getWinnerScore(match).loser}
                </span>
              </div>
            </div>

            <p className="min-w-0 text-[1rem] font-medium text-slate-700">
              <span className="block truncate">{getMobilePlayerName(getLoserName(match))}</span>
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.25 13.25 17 17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
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

export function MatchesListView({
  initialMatches,
  opponentOptions,
  viewer,
}: MatchesListViewProps) {
  const [searchValue, setSearchValue] = useState("");
  const [requestedPage, setRequestedPage] = useState(1);
  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearchValue = deferredSearchValue.trim().toLowerCase();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isCreateOpen = searchParams.get("create") === "1";
  const matches = initialMatches;

  const filteredMatches = matches.filter((match) => {
    if (!normalizedSearchValue) {
      return true;
    }

    const playerNames = `${match.player1} ${match.player2}`.toLowerCase();
    return playerNames.includes(normalizedSearchValue);
  });

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / MATCHES_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStartIndex = (currentPage - 1) * MATCHES_PAGE_SIZE;
  const currentMatches = filteredMatches.slice(pageStartIndex, pageStartIndex + MATCHES_PAGE_SIZE);
  const hasMatches = filteredMatches.length > 0;

  async function handleCreateMatch(payload: CreateMatchPayload) {
    const result = await createCompletedMatchAction({
      opponentParticipantId: payload.opponent.id,
      format: payload.format,
      winner: payload.winner,
      score: payload.score,
    });

    if (!result.ok) {
      return result;
    }

    setSearchValue("");
    setRequestedPage(1);
    router.replace(pathname, { scroll: false });
    router.refresh();

    return { ok: true as const };
  }

  function handleOpenCreate() {
    router.replace(`${pathname}?create=1`, { scroll: false });
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1040px] min-w-0 overflow-x-hidden">
        <div className="space-y-3 md:mx-auto md:max-w-[860px] md:space-y-3">
          <header className="hidden md:block">
            <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950">Матчи</h1>
          </header>

          <div className="md:hidden">
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600"
              onClick={handleOpenCreate}
              type="button"
            >
              <PlusIcon />
              Создать матч
            </button>
          </div>

          <section className="space-y-2.5 md:space-y-3">
            <div className="md:px-0 md:py-0">
              <div className="flex items-center justify-between gap-3">
                <SearchField
                  onChange={(value) => {
                    setSearchValue(value);
                    setRequestedPage(1);
                  }}
                  value={searchValue}
                />

                <button
                  className="hidden min-h-10 shrink-0 items-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.86rem] font-semibold text-white transition hover:bg-blue-600 md:inline-flex"
                  onClick={handleOpenCreate}
                  type="button"
                >
                  <PlusIcon />
                  Создать матч
                </button>
              </div>
            </div>

            {hasMatches ? (
              <>
                <DesktopMatchesTable matches={currentMatches} />
                <MobileMatchesCards matches={currentMatches} />
                <Pagination
                  currentPage={currentPage}
                  onPageChange={setRequestedPage}
                  pageSize={MATCHES_PAGE_SIZE}
                  totalItems={filteredMatches.length}
                  totalPages={totalPages}
                />
              </>
            ) : (
              <EmptyMatchesState />
            )}
          </section>
        </div>
      </div>

      <CreateMatchSheet
        isOpen={isCreateOpen}
        onClose={() => router.replace(pathname, { scroll: false })}
        onSubmit={handleCreateMatch}
        opponentOptions={opponentOptions}
        viewerName={viewer.displayName}
      />
    </>
  );
}
