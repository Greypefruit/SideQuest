"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getTournamentListBadge,
  getTournamentStatusChipUi,
} from "@/src/tournaments/display-state";
import type { TournamentRuntimeState } from "@/src/tournaments/runtime-state";

const TOURNAMENTS_PAGE_SIZE_DESKTOP = 20;
const TOURNAMENTS_PAGE_SIZE_MOBILE = 10;

type TournamentTab = "my" | "all";

type TournamentListEntry = {
  hasBracket: boolean;
  id: string;
  isViewerParticipant: boolean;
  matchFormat: "BO1" | "BO3" | "BO5";
  participantsCount: number;
  runtimeState: TournamentRuntimeState;
  scheduledAt: string | null;
  title: string;
};

type TournamentsListSectionProps = {
  activeTab: TournamentTab;
  entries: TournamentListEntry[];
  hasAnyVisibleCompetitions: boolean;
  isManager: boolean;
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateViewport = () => setIsDesktop(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  return isDesktop;
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
    return 1;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return parsedValue;
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

function formatTournamentScheduledAt(value: string | null) {
  if (!value) {
    return null;
  }

  const scheduledAt = new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  const day = String(scheduledAt.getDate()).padStart(2, "0");
  const month = String(scheduledAt.getMonth() + 1).padStart(2, "0");
  const year = String(scheduledAt.getFullYear()).slice(-2);
  const hours = String(scheduledAt.getHours()).padStart(2, "0");
  const minutes = String(scheduledAt.getMinutes()).padStart(2, "0");

  const datePart = `${day}.${month}.${year}`;

  if (hours === "00" && minutes === "00") {
    return datePart;
  }

  return `${datePart} · ${hours}:${minutes}`;
}

function TournamentCard({ entry }: { entry: TournamentListEntry }) {
  const statusUi =
    getTournamentListBadge({
      hasBracket: entry.hasBracket,
      isViewerParticipant: entry.isViewerParticipant,
      runtimeState: entry.runtimeState,
    }) ?? getTournamentStatusChipUi(entry.runtimeState);
  const scheduledAtText = formatTournamentScheduledAt(entry.scheduledAt);
  const isCompleted = entry.runtimeState.status === "completed";
  const isCancelled = entry.runtimeState.status === "cancelled";

  return (
    <article
      className={`relative rounded-[var(--radius-default)] border px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition-[background-color,border-color,transform] duration-150 ease-out ${
        isCompleted
          ? "border-slate-300 bg-slate-100 hover:border-slate-400 hover:bg-slate-150 active:border-slate-400 active:bg-slate-150"
          : isCancelled
            ? "border-rose-200 bg-rose-50 hover:border-rose-300 hover:bg-rose-100 active:border-rose-300 active:bg-rose-100"
          : "border-[#D9E2F0] bg-white hover:-translate-y-px hover:border-blue-200 hover:bg-blue-50 active:border-blue-300 active:bg-blue-100"
      }`}
    >
      <Link
        aria-label={`Открыть турнир «${entry.title}»`}
        className="absolute inset-0 z-10 md:hidden"
        href={`/tournaments/${entry.id}`}
      />
      <Link
        aria-label={`Открыть турнир «${entry.title}»`}
        className="absolute inset-0 z-10 hidden md:block"
        href={`/tournaments/${entry.id}`}
      />

      <div className="flex items-start justify-between gap-4 md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <h2 className="max-w-[34rem] text-[1.05rem] font-semibold leading-6 tracking-tight text-slate-900 md:text-[1.15rem]">
              {entry.title}
            </h2>
          </div>

          <p className="mt-2 text-[0.9rem] leading-6 text-slate-500">
            Настольный теннис · На выбывание (Посев) · {entry.matchFormat}
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
              {formatParticipantsLabel(entry.participantsCount)}
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

function EmptyState({
  title,
  description,
  showCreateButton,
  variant,
  createHref,
}: {
  title: string;
  description: string;
  showCreateButton: boolean;
  variant: "manager" | "player";
  createHref: string;
}) {
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

function ScopedEmptyState({ activeTab }: { activeTab: TournamentTab }) {
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

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 min-w-[4.9rem] items-center justify-center rounded-[var(--radius-default)] px-5 text-[0.92rem] font-semibold transition md:min-h-10 md:min-w-[4.6rem] md:px-[1.05rem] md:text-[0.86rem] ${
        active
          ? "bg-blue-500 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}

function Pagination({
  currentPage,
  totalItems,
  totalPages,
  pageSize,
  activeTab,
}: {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
  activeTab: TournamentTab;
}) {
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

export function TournamentsListSection({
  activeTab,
  entries,
  hasAnyVisibleCompetitions,
  isManager,
}: TournamentsListSectionProps) {
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const pageSize = isDesktop
    ? TOURNAMENTS_PAGE_SIZE_DESKTOP
    : TOURNAMENTS_PAGE_SIZE_MOBILE;
  const currentPageFromUrl = parsePositivePage(
    getSingleSearchParam(searchParams.get("page") ?? undefined),
  );
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const currentPage = Math.min(currentPageFromUrl, totalPages);
  const pageStartIndex = (currentPage - 1) * pageSize;
  const currentEntries = entries.slice(pageStartIndex, pageStartIndex + pageSize);
  const createHref = buildTournamentsHref(activeTab, currentPage, { create: true });

  if (!hasAnyVisibleCompetitions) {
    return isManager ? (
      <EmptyState
        createHref={createHref}
        description="Создайте первый турнир, чтобы начать работу."
        showCreateButton
        title="Пока нет турниров"
        variant="manager"
      />
    ) : (
      <EmptyState
        createHref={createHref}
        description="Когда появятся новые турниры, они будут отображаться здесь."
        showCreateButton={false}
        title="Пока нет доступных турниров"
        variant="player"
      />
    );
  }

  return (
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
            <Link
              href={createHref}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600"
            >
              <PlusIcon />
              Создать турнир
            </Link>

            <nav aria-label="Фильтр турниров" className="flex items-center justify-end gap-2">
              <TabLink active={activeTab === "my"} href="/tournaments?tab=my" label="Мои" />
              <TabLink active={activeTab === "all"} href="/tournaments?tab=all" label="Все" />
            </nav>
          </div>
        </>
      ) : null}

      {entries.length === 0 ? (
        <ScopedEmptyState activeTab={activeTab} />
      ) : (
        <>
          <section className="space-y-3">
            {currentEntries.map((entry) => (
              <TournamentCard
                key={entry.id}
                entry={entry}
              />
            ))}
          </section>

          <Pagination
            activeTab={activeTab}
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={entries.length}
            totalPages={totalPages}
          />
        </>
      )}
    </div>
  );
}
