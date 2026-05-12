"use client";

import Link from "next/link";
import { useState } from "react";
import type { TournamentActionItem } from "@/src/db/queries/tournament-actions";
import {
  getTournamentListBadge,
  getTournamentStatusChipUi,
} from "@/src/tournaments/display-state";
import type { TournamentRuntimeState } from "@/src/tournaments/runtime-state";

type TournamentTab = "all" | "archive" | "my" | "participating";

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
  allEntries: TournamentListEntry[];
  archiveEntries: TournamentListEntry[];
  createHref: string;
  hasAnyVisibleCompetitions: boolean;
  isManager: boolean;
  managementEntries: TournamentActionItem[];
  myArchiveEntries: TournamentListEntry[];
  myEntries: TournamentListEntry[];
  participatingEntries: TournamentListEntry[];
};

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

function ChevronDownIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
      fill="none"
      height="14"
      viewBox="0 0 14 14"
      width="14"
    >
      <path
        d="M3.5 5.25 7 8.75l3.5-3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function ManagementStatusBadge({ label }: { label: TournamentActionItem["statusLabel"] }) {
  const className =
    label === "Ждет результат"
      ? "border-rose-200 bg-rose-50 text-rose-600"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex min-h-5 items-center rounded-full border px-2 text-[0.65rem] font-semibold leading-none ${className}`}
    >
      {label}
    </span>
  );
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

  if (hours === "00" && minutes === "00") {
    return `${day}.${month}.${year}`;
  }

  return `${day}.${month}.${year} · ${hours}:${minutes}`;
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
          ? "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 active:border-slate-400 active:bg-slate-50"
          : isCancelled
            ? "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 active:border-slate-400 active:bg-slate-50"
            : "border-[#D9E2F0] bg-white hover:-translate-y-px hover:border-blue-200 hover:bg-blue-50 active:border-blue-300 active:bg-blue-100"
      }`}
    >
      <Link
        aria-label={`Открыть турнир «${entry.title}»`}
        className="absolute inset-0 z-10"
        href={`/tournaments/${entry.id}`}
      />

      <div className="flex items-start justify-between gap-4 md:gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="max-w-[34rem] text-[1.05rem] font-semibold leading-6 tracking-tight text-slate-900 md:text-[1.15rem]">
            {entry.title}
          </h2>

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

function ManagementTournamentCard({ item }: { item: TournamentActionItem }) {
  return (
    <article className="rounded-[var(--radius-default)] border border-blue-200 bg-white px-3.5 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <ManagementStatusBadge label={item.statusLabel} />

          <h3 className="mt-2 truncate text-[0.96rem] font-semibold leading-5 tracking-tight text-slate-900">
            {item.title}
          </h3>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-slate-500">
              <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
                <path
                  d="M5.333 6.333a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM10.667 7.667a1.667 1.667 0 1 0 0-3.334 1.667 1.667 0 0 0 0 3.334ZM2.667 12.667v-.334c0-1.472 1.194-2.666 2.666-2.666h.667c1.473 0 2.667 1.194 2.667 2.666v.334M9 12.667v-.334c0-1.104.895-2 2-2h.333c1.105 0 2 .896 2 2v.334"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
              </svg>
              {item.participantsCount}/{item.maxParticipants}
            </p>

            <Link
              href={item.ctaHref}
              className="shrink-0 inline-flex min-h-6.5 items-center justify-center rounded-[var(--radius-default)] border border-blue-300 bg-white px-2.5 text-[0.72rem] font-semibold text-blue-600 transition hover:border-blue-400 hover:bg-blue-50"
            >
              {item.ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function SectionEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-5 py-7 text-center shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
      <div className="mx-auto flex max-w-[28rem] flex-col items-center justify-center">
        <h2 className="text-[1rem] font-semibold tracking-tight text-slate-800">{title}</h2>
        <p className="mt-1 text-[0.9rem] leading-6 text-slate-500">{description}</p>
      </div>
    </section>
  );
}

function PageEmptyState({
  createHref,
  isManager,
}: {
  createHref: string;
  isManager: boolean;
}) {
  return (
    <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-6 py-9 text-center shadow-[0_12px_28px_rgba(15,23,42,0.03)] md:px-8 md:py-10">
      <div className="mx-auto flex max-w-[24rem] flex-col items-center justify-center gap-2.5">
        <h2 className="text-[1.1rem] font-semibold tracking-tight text-slate-800 md:text-[1.15rem]">
          Пока нет турниров
        </h2>
        <p className="text-[0.9rem] leading-6 text-slate-500">
          {isManager
            ? "Создайте первый турнир, чтобы начать работу с сеткой и результатами."
            : "Когда в системе появятся турниры, они будут отображаться здесь."}
        </p>

        {isManager ? (
          <div className="mt-3">
            <Link
              href={createHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 md:min-h-10 md:text-[0.86rem]"
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

function TabLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default)] px-5 text-[0.92rem] font-semibold transition md:min-h-10 md:px-[1.05rem] md:text-[0.86rem] ${
        active ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}

function ManagementSection({ entries }: { entries: TournamentActionItem[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleEntries = isExpanded ? entries : entries.slice(0, 3);
  const hiddenCount = Math.max(0, entries.length - 3);

  return (
    <section className="space-y-3 rounded-[var(--radius-default)] border border-slate-200/90 bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.03)] md:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[0.96rem] font-semibold tracking-tight text-slate-900">
            Требуют внимания
          </h2>
        </div>

        {hiddenCount > 0 ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[0.84rem] font-semibold text-blue-600 transition hover:text-blue-700"
            onClick={() => setIsExpanded((current) => !current)}
          >
            <span>{isExpanded ? "Свернуть" : "Показать еще"}</span>
            <ChevronDownIcon expanded={isExpanded} />
          </button>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <SectionEmptyState
          description="Сейчас нет турниров, где нужно запустить сетку или внести результат."
          title="Нет задач, требующих действия"
        />
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {visibleEntries.map((entry) => (
            <ManagementTournamentCard key={entry.id} item={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

function getActiveTabEntries(
  activeTab: TournamentTab,
  entries: {
    all: TournamentListEntry[];
    archive: TournamentListEntry[];
    my: TournamentListEntry[];
    participating: TournamentListEntry[];
  },
) {
  switch (activeTab) {
    case "my":
      return entries.my;
    case "participating":
      return entries.participating;
    case "archive":
      return entries.archive;
    case "all":
      return entries.all;
  }
}

function getEmptyStateCopy(activeTab: TournamentTab) {
  switch (activeTab) {
    case "my":
      return {
        description: "Создайте первый турнир, чтобы он появился в разделе «Мои турниры».",
        title: "У вас пока нет своих турниров",
      };
    case "participating":
      return {
        description: "Когда вы будете добавлены в турнир, он появится в этом разделе.",
        title: "Вы пока не участвуете в турнирах",
      };
    case "archive":
      return {
        description: "Завершенные и отмененные турниры появятся здесь.",
        title: "Архив турниров пока пуст",
      };
    case "all":
      return {
        description: "Когда появятся активные турниры, они будут отображаться здесь.",
        title: "Сейчас нет активных турниров",
      };
  }
}

function ArchiveSection({ entries }: { entries: TournamentListEntry[] }) {
  return (
    <PaginatedTournamentSection entries={entries} pageSize={5} title="Архив" />
  );
}

function SectionCount({ count }: { count: number }) {
  return (
    <span className="inline-flex min-h-4.5 items-center rounded-full bg-slate-100 px-2 text-[0.68rem] font-semibold text-slate-600">
      {count}
    </span>
  );
}

function ActiveSectionCount({ count }: { count: number }) {
  return (
    <span className="inline-flex min-h-4.5 items-center rounded-full bg-blue-100 px-2 text-[0.68rem] font-semibold text-blue-700">
      {count}
    </span>
  );
}

function SectionPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        className="inline-flex min-h-7 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-2.5 text-[0.76rem] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Назад
      </button>
      <span className="inline-flex min-h-7 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-2.5 text-[0.74rem] font-semibold text-slate-600">
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        className="inline-flex min-h-7 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-2.5 text-[0.76rem] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Вперед
      </button>
    </div>
  );
}

function PaginatedTournamentSection({
  entries,
  pageSize,
  title,
}: {
  entries: TournamentListEntry[];
  pageSize: number;
  title: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);

  if (entries.length === 0) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const visibleEntries = entries.slice(pageStart, pageStart + pageSize);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-[0.92rem] font-semibold tracking-tight text-slate-900">{title}</h3>
        {title === "Активные" || title === "Все" || title === "Участвую" ? (
          <ActiveSectionCount count={entries.length} />
        ) : (
          <SectionCount count={entries.length} />
        )}
      </div>

      <div className="space-y-3">
        {visibleEntries.map((entry) => (
          <TournamentCard key={entry.id} entry={entry} />
        ))}
      </div>

      <SectionPagination
        currentPage={safePage}
        onPageChange={setCurrentPage}
        totalPages={totalPages}
      />
    </section>
  );
}

export function TournamentsListSection({
  activeTab,
  allEntries,
  archiveEntries,
  createHref,
  hasAnyVisibleCompetitions,
  isManager,
  managementEntries,
  myArchiveEntries,
  myEntries,
  participatingEntries,
}: TournamentsListSectionProps) {
  const entries = getActiveTabEntries(activeTab, {
    all: allEntries,
    archive: archiveEntries,
    my: myEntries,
    participating: participatingEntries,
  });
  const emptyStateCopy = getEmptyStateCopy(activeTab);

  if (!hasAnyVisibleCompetitions) {
    return <PageEmptyState createHref={createHref} isManager={isManager} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {isManager ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <nav aria-label="Фильтр турниров" className="flex flex-wrap items-center gap-2">
              <TabLink
                active={activeTab === "my"}
                href={buildTournamentsHref("my")}
                label="Мои турниры"
              />
              <TabLink
                active={activeTab === "participating"}
                href={buildTournamentsHref("participating")}
                label="Участвую"
              />
              <TabLink active={activeTab === "all"} href={buildTournamentsHref("all")} label="Все" />
              <TabLink
                active={activeTab === "archive"}
                href={buildTournamentsHref("archive")}
                label="Архив"
              />
            </nav>

            <Link
              href={createHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 md:min-h-10 md:text-[0.86rem]"
            >
              <PlusIcon />
              Создать турнир
            </Link>
          </div>
        ) : (
          <nav aria-label="Фильтр турниров" className="flex flex-wrap items-center gap-2">
            <TabLink
              active={activeTab === "participating"}
              href={buildTournamentsHref("participating")}
              label="Участвую"
            />
            <TabLink active={activeTab === "all"} href={buildTournamentsHref("all")} label="Все" />
            <TabLink
              active={activeTab === "archive"}
              href={buildTournamentsHref("archive")}
              label="Архив"
            />
          </nav>
        )}
      </div>

      {isManager ? <ManagementSection entries={managementEntries} /> : null}

      {activeTab === "my" ? (
        myEntries.length === 0 && myArchiveEntries.length === 0 ? (
          <SectionEmptyState
            description={emptyStateCopy.description}
            title={emptyStateCopy.title}
          />
        ) : (
          <div className="space-y-5">
            {myEntries.length > 0 ? (
              <PaginatedTournamentSection entries={myEntries} pageSize={10} title="Активные" />
            ) : (
              <SectionEmptyState
                description="Сейчас у вас нет активных турниров."
                title="Нет активных турниров"
              />
            )}

            <ArchiveSection entries={myArchiveEntries} />
          </div>
        )
      ) : entries.length === 0 ? (
        <SectionEmptyState
          description={emptyStateCopy.description}
          title={emptyStateCopy.title}
        />
      ) : activeTab === "archive" ? (
        <PaginatedTournamentSection entries={entries} pageSize={10} title="Архив" />
      ) : activeTab === "all" ? (
        <PaginatedTournamentSection entries={entries} pageSize={10} title="Все" />
      ) : activeTab === "participating" ? (
        <PaginatedTournamentSection entries={entries} pageSize={10} title="Участвую" />
      ) : (
        <section className="space-y-3">
          {entries.map((entry) => (
            <TournamentCard key={entry.id} entry={entry} />
          ))}
        </section>
      )}
    </div>
  );
}
