"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
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

type MatchType = "normal" | "tournament";

type MatchItem = {
  id: string;
  createdAt: string;
  format: MatchFormat;
  loserRatingDelta: number | null;
  matchType: MatchType;
  player1: string;
  player2: string;
  score: MatchScore;
  winnerRatingDelta: number | null;
};

type MatchesListViewProps = {
  initialMatches: MatchItem[];
  opponentOptions: OpponentOption[];
  viewer: AuthenticatedViewer;
};

const MATCHES_PAGE_SIZE_DESKTOP = 20;
const MATCHES_PAGE_SIZE_MOBILE = 10;

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

function getWinnerRatingDelta(match: MatchItem) {
  return match.winnerRatingDelta;
}

function getLoserRatingDelta(match: MatchItem) {
  return match.loserRatingDelta;
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

type MatchTypeFilter = {
  value: MatchType;
  label: string;
};

const MATCH_TYPE_FILTERS: MatchTypeFilter[] = [
  { value: "normal", label: "Обычные" },
  { value: "tournament", label: "Турнирные" },
];

type MatchTypeTabsProps = {
  value: MatchType;
  onChange: (value: MatchType) => void;
};

function MatchTypeTabs({ value, onChange }: MatchTypeTabsProps) {
  return (
    <div
      aria-label="Фильтр по типу матчей"
      className="grid min-h-10.5 w-full grid-cols-2 rounded-[var(--radius-default)] border border-slate-200 bg-white p-1 md:min-h-10 md:w-auto md:min-w-[260px]"
      role="tablist"
    >
      {MATCH_TYPE_FILTERS.map((filter) => {
        const isActive = filter.value === value;

        return (
          <button
            aria-selected={isActive}
            className={[
              "inline-flex h-full min-h-0 items-center justify-center rounded-[calc(var(--radius-default)-4px)] px-4 text-[0.9rem] font-medium transition",
              isActive
                ? "bg-blue-50 text-blue-600"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
            ].join(" ")}
            key={filter.value}
            onClick={() => onChange(filter.value)}
            role="tab"
            type="button"
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

type EmptyMatchesStateProps = {
  title: string;
  description: string;
};

function EmptyMatchesState({ title, description }: EmptyMatchesStateProps) {
  return (
    <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-7 text-center shadow-[0_10px_24px_rgba(15,23,42,0.03)] md:px-5 md:py-8">
      <h2 className="text-[1rem] font-semibold tracking-tight text-slate-800">
        {title}
      </h2>
      <p className="mt-1 text-[0.84rem] leading-5 text-slate-500">
        {description}
      </p>
    </section>
  );
}

type RatingDeltaMetaProps = {
  align?: "left" | "right";
  delta: number | null;
  direction: "down" | "up";
};

function RatingDeltaMeta({ align = "left", delta, direction }: RatingDeltaMetaProps) {
  if (delta === null) {
    return null;
  }

  const isPositive = direction === "up";
  const valueText = String(Math.abs(delta));

  return (
    <span
      className={[
        "mt-1 inline-flex flex-wrap items-center gap-1 text-[0.75rem] leading-4",
        align === "right" ? "justify-end text-right" : "justify-start text-left",
      ].join(" ")}
    >
      <span className="text-slate-400">Рейтинг</span>
      <span
        className={[
          "inline-flex items-center gap-1 font-semibold",
          isPositive ? "text-emerald-500" : "text-rose-500",
        ].join(" ")}
      >
        {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
        {valueText}
      </span>
    </span>
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
  getRowRef: (matchId: string) => (node: HTMLTableRowElement | null) => void;
  highlightedMatchId: string | null;
  matches: MatchItem[];
};

function DesktopMatchesTable({
  getRowRef,
  highlightedMatchId,
  matches,
}: DesktopMatchesTableProps) {
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
              <tr
                key={match.id}
                ref={getRowRef(match.id)}
                className={[
                  "border-t border-slate-100 transition-colors duration-700 first:border-t-0",
                  highlightedMatchId === match.id ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "",
                ].join(" ")}
              >
                <td className="whitespace-nowrap px-5 py-3.5 align-middle text-[0.84rem] font-medium text-slate-700">
                  {formatMatchCreatedAt(match.createdAt)}
                </td>
                <td className="px-5 py-3.5 align-middle">
                  <div className="min-w-0">
                    <span className="block truncate text-[0.92rem] font-medium text-slate-800">
                      {getFullPlayerName(getWinnerName(match))}
                    </span>
                    <RatingDeltaMeta delta={getWinnerRatingDelta(match)} direction="up" />
                  </div>
                </td>
                <td className="px-5 py-3.5 align-middle">
                  <div className="min-w-0">
                    <span className="block truncate text-[0.92rem] font-medium text-slate-700">
                      {getFullPlayerName(getLoserName(match))}
                    </span>
                    <RatingDeltaMeta delta={getLoserRatingDelta(match)} direction="down" />
                  </div>
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
  getCardRef: (matchId: string) => (node: HTMLDivElement | null) => void;
  highlightedMatchId: string | null;
  matches: MatchItem[];
};

function MobileMatchesCards({
  getCardRef,
  highlightedMatchId,
  matches,
}: MobileMatchesCardsProps) {
  return (
    <section className="space-y-2.5 md:hidden">
      {matches.map((match) => (
        <article
          key={match.id}
          ref={getCardRef(match.id)}
          className={[
            "relative isolate overflow-hidden w-full rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition-[border-color,box-shadow] duration-700 ease-out",
            highlightedMatchId === match.id
              ? "border-blue-300 shadow-[0_0_0_1px_rgba(147,197,253,0.95),0_14px_30px_rgba(59,130,246,0.16)]"
              : "",
          ].join(" ")}
        >
          <div
            aria-hidden="true"
            className={[
              "pointer-events-none absolute inset-0 rounded-[inherit] bg-blue-200/70 transition-opacity duration-700 ease-out",
              highlightedMatchId === match.id ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <p className="text-[0.84rem] font-medium tracking-tight text-slate-700">
              {formatMatchCreatedAt(match.createdAt)}
            </p>

            <span className={FORMAT_CHIP_CLASS}>{match.format}</span>
          </div>

          <div className="relative z-10 mt-2.5 grid min-h-[3.4rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
            <div className="min-w-0 self-center text-right">
              <p className="text-[1rem] font-medium text-slate-800">
                <span className="block truncate">{getMobilePlayerName(getWinnerName(match))}</span>
              </p>
              <RatingDeltaMeta
                align="right"
                delta={getWinnerRatingDelta(match)}
                direction="up"
              />
            </div>

            <div className="min-w-[4.5rem] self-center text-center">
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

            <div className="min-w-0 self-center">
              <p className="text-[1rem] font-medium text-slate-700">
                <span className="block truncate">{getMobilePlayerName(getLoserName(match))}</span>
              </p>
              <RatingDeltaMeta delta={getLoserRatingDelta(match)} direction="down" />
            </div>
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

function ArrowUpIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
      <path
        d="M6 10V2M6 2 3.5 4.5M6 2l2.5 2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
      <path
        d="M6 2v8M6 10 3.5 7.5M6 10l2.5-2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [hasResolvedViewport, setHasResolvedViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateViewport = () => {
      setIsDesktop(mediaQuery.matches);
      setHasResolvedViewport(true);
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  return { hasResolvedViewport, isDesktop };
}

function parseMatchTypeParam(value: string | null): MatchType | null {
  if (value === "normal" || value === "regular") {
    return "normal";
  }

  if (value === "tournament") {
    return "tournament";
  }

  return null;
}

function buildMatchesUrl(
  pathname: string,
  options: {
    create?: string | null;
    highlightMatchId?: string | null;
    matchType?: MatchType | null;
  },
) {
  const params = new URLSearchParams();

  if (options.create === "1") {
    params.set("create", "1");
  }

  if (options.matchType) {
    params.set("type", options.matchType);
  }

  if (options.highlightMatchId) {
    params.set("highlightMatchId", options.highlightMatchId);
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function replaceMatchesUrl(nextUrl: string) {
  window.history.replaceState(window.history.state, "", nextUrl);
}

export function MatchesListView({
  initialMatches,
  opponentOptions,
  viewer,
}: MatchesListViewProps) {
  const searchParams = useSearchParams();
  const createParam = searchParams.get("create");
  const initialHighlightMatchId = searchParams.get("highlightMatchId");
  const queryMatchType = parseMatchTypeParam(searchParams.get("type"));
  const initialMatchType = queryMatchType ?? "normal";
  const { hasResolvedViewport, isDesktop } = useIsDesktop();
  const [searchValue, setSearchValue] = useState("");
  const [selectedMatchType, setSelectedMatchType] = useState<MatchType>(initialMatchType);
  const [requestedPage, setRequestedPage] = useState(1);
  const [activeHighlightMatchId, setActiveHighlightMatchId] = useState<string | null>(null);
  const [pendingHighlightMatchId, setPendingHighlightMatchId] = useState<string | null>(
    initialHighlightMatchId,
  );
  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearchValue = deferredSearchValue.trim().toLowerCase();
  const pathname = usePathname();
  const router = useRouter();
  const isCreateOpen = createParam === "1";
  const highlightedMatch = pendingHighlightMatchId
    ? initialMatches.find((match) => match.id === pendingHighlightMatchId) ?? null
    : null;
  const matches = initialMatches;
  const pageSize = isDesktop ? MATCHES_PAGE_SIZE_DESKTOP : MATCHES_PAGE_SIZE_MOBILE;
  const desktopRowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const mobileCardRefs = useRef(new Map<string, HTMLDivElement>());
  const highlightTimeoutRef = useRef<number | null>(null);
  const consumedHighlightMatchIdRef = useRef<string | null>(null);

  const typeFilteredMatches = matches.filter(
    (match) => match.matchType === selectedMatchType,
  );

  const filteredMatches = typeFilteredMatches.filter((match) => {
    if (!normalizedSearchValue) {
      return true;
    }

    const playerNames = `${match.player1} ${match.player2}`.toLowerCase();
    return playerNames.includes(normalizedSearchValue);
  });

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStartIndex = (currentPage - 1) * pageSize;
  const currentMatches = filteredMatches.slice(pageStartIndex, pageStartIndex + pageSize);
  const hasMatches = filteredMatches.length > 0;
  const isNavigatingToHighlightedMatch =
    hasResolvedViewport &&
    pendingHighlightMatchId !== null &&
    !currentMatches.some((match) => match.id === pendingHighlightMatchId);

  useEffect(() => {
    if (
      pendingHighlightMatchId &&
      highlightedMatch &&
      highlightedMatch.matchType !== selectedMatchType
    ) {
      setSelectedMatchType(highlightedMatch.matchType);
      setRequestedPage(1);
    }
  }, [pendingHighlightMatchId, highlightedMatch, selectedMatchType]);

  useEffect(() => {
    if (!hasResolvedViewport) {
      return;
    }

    if (!pendingHighlightMatchId) {
      consumedHighlightMatchIdRef.current = null;
      return;
    }

    const matchIndex = typeFilteredMatches.findIndex(
      (match) => match.id === pendingHighlightMatchId,
    );

    if (matchIndex === -1) {
      return;
    }

    const nextPage = Math.floor(matchIndex / pageSize) + 1;

    if (requestedPage !== nextPage) {
      setRequestedPage(nextPage);
    }
  }, [hasResolvedViewport, pageSize, pendingHighlightMatchId, requestedPage, typeFilteredMatches]);

  useEffect(() => {
    if (!hasResolvedViewport) {
      return;
    }

    if (!pendingHighlightMatchId) {
      return;
    }

    if (consumedHighlightMatchIdRef.current === pendingHighlightMatchId) {
      return;
    }

    const isVisible = currentMatches.some((match) => match.id === pendingHighlightMatchId);

    if (!isVisible) {
      return;
    }

    const targetNode = isDesktop
      ? desktopRowRefs.current.get(pendingHighlightMatchId)
      : mobileCardRefs.current.get(pendingHighlightMatchId);

    if (!targetNode) {
      return;
    }

    targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
    consumedHighlightMatchIdRef.current = pendingHighlightMatchId;
    setActiveHighlightMatchId(pendingHighlightMatchId);
  }, [currentMatches, hasResolvedViewport, isDesktop, pendingHighlightMatchId]);

  useEffect(() => {
    if (!activeHighlightMatchId) {
      return;
    }

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setActiveHighlightMatchId((current) =>
        current === activeHighlightMatchId ? null : current,
      );
      setPendingHighlightMatchId(null);
      replaceMatchesUrl(
        buildMatchesUrl(pathname, {
          create: createParam,
          matchType: selectedMatchType,
        }),
      );
    }, 2200);

    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, [activeHighlightMatchId, createParam, pathname, router, selectedMatchType]);

  const emptyState = normalizedSearchValue
    ? {
        title: "Матчи не найдены",
        description: "Попробуйте изменить запрос или переключить тип матчей.",
      }
    : selectedMatchType === "normal"
      ? {
          title: "Обычных матчей пока нет",
          description: "Добавьте первую завершенную запись, чтобы список матчей появился здесь.",
        }
      : {
          title: "Турнирных матчей пока нет",
          description: "Сыгранные матчи из турниров появятся здесь после внесения результата.",
        };

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

  function getDesktopRowRef(matchId: string) {
    return (node: HTMLTableRowElement | null) => {
      if (node) {
        desktopRowRefs.current.set(matchId, node);
        return;
      }

      desktopRowRefs.current.delete(matchId);
    };
  }

  function getMobileCardRef(matchId: string) {
    return (node: HTMLDivElement | null) => {
      if (node) {
        mobileCardRefs.current.set(matchId, node);
        return;
      }

      mobileCardRefs.current.delete(matchId);
    };
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1040px] min-w-0 overflow-x-hidden">
        <div className="space-y-3 md:mx-auto md:max-w-[860px] md:space-y-3">
          <header className="hidden md:block">
            <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950">Матчи</h1>
          </header>

          <section className="space-y-2.5 pb-24 md:space-y-3 md:pb-0">
            <div className="md:px-0 md:py-0">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-col gap-3 md:flex-1 md:flex-row md:items-center">
                  <SearchField
                    onChange={(value) => {
                      setSearchValue(value);
                      setRequestedPage(1);
                    }}
                    value={searchValue}
                  />
                  <MatchTypeTabs
                    onChange={(value) => {
                      setSelectedMatchType(value);
                      setRequestedPage(1);
                      replaceMatchesUrl(
                        buildMatchesUrl(pathname, {
                          create: createParam,
                          matchType: value,
                        }),
                      );
                    }}
                    value={selectedMatchType}
                  />
                </div>
                <button
                  className="hidden min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.86rem] font-semibold text-white transition hover:bg-blue-600 md:ml-auto md:inline-flex md:w-auto"
                  onClick={handleOpenCreate}
                  type="button"
                >
                  <PlusIcon />
                  Записать матч
                </button>
              </div>
            </div>

            {isNavigatingToHighlightedMatch ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-default)] border border-blue-100 bg-blue-50 px-3 py-2 text-[0.82rem] font-medium text-blue-700">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"
                />
                <span>Переходим к матчу...</span>
              </div>
            ) : null}

            {hasMatches ? (
              <>
                <DesktopMatchesTable
                  getRowRef={getDesktopRowRef}
                  highlightedMatchId={activeHighlightMatchId}
                  matches={currentMatches}
                />
                <MobileMatchesCards
                  getCardRef={getMobileCardRef}
                  highlightedMatchId={activeHighlightMatchId}
                  matches={currentMatches}
                />
                <Pagination
                  currentPage={currentPage}
                  onPageChange={setRequestedPage}
                  pageSize={pageSize}
                  totalItems={filteredMatches.length}
                  totalPages={totalPages}
                />
              </>
            ) : (
              <EmptyMatchesState
                description={emptyState.description}
                title={emptyState.title}
              />
            )}
          </section>
        </div>
      </div>

      <button
        aria-label="Записать матч"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+6rem)] right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full border border-blue-500 bg-blue-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 md:hidden"
        onClick={handleOpenCreate}
        type="button"
      >
        <PlusIcon />
      </button>

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
