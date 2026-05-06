import type { ReactNode } from "react";
import Link from "next/link";
import { getPlayerHomeData } from "@/src/db/queries";
import { PlayerHomeMobileStats } from "./player-home-mobile-stats";
import { PlayerRatingChangesList } from "./player-rating-changes-list";

const MATCHES_CTA_HREF = "/matches?create=1";
const TOURNAMENTS_HREF = "/tournaments";
const SURFACE_CLASS_NAME =
  "rounded-[var(--radius-default)] border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.03)]";
const SURFACE_SOFT_CLASS_NAME =
  "rounded-[var(--radius-default)] border border-slate-200/80 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.025)]";
const MUTED_TEXT_CLASS_NAME = "text-slate-500";

type PlayerHomeDashboardProps = {
  profileId: string;
};

function formatTournamentDate(value: Date | null) {
  if (!value) {
    return "Дата уточняется";
  }

  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = String(value.getFullYear()).slice(-2);
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  if (hours === "00" && minutes === "00") {
    return `${day}.${month}.${year}`;
  }

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function getCalendarDayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function formatCompactDateTime(value: Date) {
  const now = new Date();
  const diffMs = now.getTime() - value.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    const minutes = Math.max(1, diffMinutes);
    return `${minutes} мин. назад`;
  }

  if (diffMinutes < 24 * 60) {
    return `${Math.floor(diffMinutes / 60)} ч. назад`;
  }

  const todayStart = getCalendarDayStart(now);
  const valueStart = getCalendarDayStart(value);
  const dayDiff = Math.round((todayStart - valueStart) / (24 * 60 * 60 * 1000));

  if (dayDiff === 1) {
    return "вчера";
  }

  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = String(value.getFullYear()).slice(-2);

  return `${day}.${month}.${year}`;
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

function ParticipantsIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="M5.333 6.333a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM10.667 7.667a1.667 1.667 0 1 0 0-3.334 1.667 1.667 0 0 0 0 3.334ZM2.667 12.667v-.334c0-1.472 1.194-2.666 2.666-2.666h.667c1.473 0 2.667 1.194 2.667 2.666v.334M9 12.667v-.334c0-1.104.895-2 2-2h.333c1.105 0 2 .896 2 2v.334"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function MetaDivider() {
  return <span aria-hidden="true">·</span>;
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 14 14" width="14">
      <path
        d="M7 2.333v9.334M2.333 7h9.334"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function MatchCtaButton({
  className = "",
  fullWidth = false,
}: {
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <Link
      href={MATCHES_CTA_HREF}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.9rem] font-semibold text-white transition hover:bg-blue-600 ${
        fullWidth ? "w-full" : ""
      } ${className}`}
    >
      <PlusIcon />
      Записать матч
    </Link>
  );
}

function formatMatchFormat(value: "BO1" | "BO3" | "BO5") {
  switch (value) {
    case "BO1":
      return "Best of 1";
    case "BO3":
      return "Best of 3";
    case "BO5":
      return "Best of 5";
  }
}

function getBracketRoundLabel(participantsCount: number) {
  if (participantsCount <= 1) {
    return null;
  }

  let bracketSize = 1;

  while (bracketSize < participantsCount) {
    bracketSize *= 2;
  }

  if (bracketSize <= 2) {
    return "Финал";
  }

  if (bracketSize === 4) {
    return "1/2 финала";
  }

  if (bracketSize === 8) {
    return "1/4 финала";
  }

  if (bracketSize === 16) {
    return "1/8 финала";
  }

  return `1/${bracketSize / 2} финала`;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-[0.75rem] font-bold uppercase tracking-[0.09em] text-slate-500">
      {children}
    </h2>
  );
}

function DashboardButton({
  href,
  children,
  primary = false,
  fullWidth = false,
  compact = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-default)] border font-semibold transition ${
        compact
          ? "min-h-9 px-3 py-2 text-[0.82rem]"
          : "min-h-11 px-4 py-2.5 text-[0.92rem] md:min-h-10 md:px-3.5 md:py-2 md:text-[0.84rem]"
      } ${
        fullWidth ? "w-full md:w-auto" : ""
      } ${
        primary
          ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          : "border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400 hover:bg-slate-100"
      }`}
    >
      <span>{children}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`${SURFACE_SOFT_CLASS_NAME} px-4 py-3.5 text-center`}>
      <p className="text-[0.63rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2.5 text-[1.85rem] font-semibold leading-none tracking-tight ${
          accent ? "text-blue-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CompactStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[72px] flex-col justify-center border-slate-200 bg-white px-3 py-2.5 text-center [&:not(:last-child)]:border-r">
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-[1.12rem] font-semibold leading-none tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function PlayerTournamentCard({
  tournament,
}: {
  tournament: Awaited<ReturnType<typeof getPlayerHomeData>>["tournaments"][number];
}) {
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className={`group block ${SURFACE_SOFT_CLASS_NAME} px-4 py-4 transition hover:border-blue-200 hover:bg-blue-50 md:px-3 md:py-2.5`}
    >
        <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[0.98rem] font-semibold leading-5 tracking-tight text-slate-900">
            {tournament.title}
          </h3>
          <div className={`mt-2 space-y-0.5 text-[0.74rem] ${MUTED_TEXT_CLASS_NAME}`}>
            <p>{tournament.activityName}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{formatTournamentDate(tournament.scheduledAt)}</span>
              <MetaDivider />
              <span className="inline-flex items-center gap-1.5">
                <ParticipantsIcon />
                {tournament.participantsCount}/{tournament.maxParticipants}
              </span>
            </div>
          </div>
        </div>

        <span
          aria-hidden="true"
          className="shrink-0 self-center text-[0.82rem] text-slate-300 transition group-hover:text-blue-500"
        >
          ›
        </span>
      </div>
    </Link>
  );
}

export async function PlayerHomeDashboard({ profileId }: PlayerHomeDashboardProps) {
  const data = await getPlayerHomeData(profileId);

  return (
    <div className="mx-auto w-full max-w-[1200px] min-w-0 overflow-x-hidden">
      <div className="space-y-5 pb-20 md:mx-auto md:max-w-[860px] md:pb-0 lg:space-y-4">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.34fr)_minmax(290px,0.9fr)] lg:items-start lg:gap-6">
          <section className="space-y-3">
            <SectionTitle>Ваш ближайший турнир</SectionTitle>

            <div className={`${SURFACE_CLASS_NAME} px-4 py-4 md:px-5 md:py-4.5`}>
              {data.nearestTournament ? (
                <div className="flex flex-col gap-4 md:gap-4.5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2 md:hidden">
                        <span className="inline-flex min-h-5 items-center rounded-[var(--radius-default)] border border-blue-100 bg-blue-50 px-2 text-[0.54rem] font-semibold tracking-[0.08em] text-blue-700">
                          {data.nearestTournament.statusLabel}
                        </span>
                      </div>
                      <div className="md:flex md:items-start md:justify-between md:gap-4">
                        <h3 className="mt-2.5 line-clamp-2 min-w-0 text-[1.35rem] font-semibold leading-tight tracking-tight text-slate-950 md:mt-0 md:flex-1 md:text-[1.3rem] md:line-clamp-none">
                          {data.nearestTournament.title}
                        </h3>
                        <span className="hidden md:mt-0.5 md:inline-flex md:min-h-7 md:shrink-0 md:items-center md:self-start md:rounded-[var(--radius-default)] md:border md:border-blue-100 md:bg-blue-50 md:px-2.5 md:text-[0.64rem] md:font-semibold md:tracking-[0.05em] md:text-blue-700">
                          {data.nearestTournament.statusLabel.toUpperCase()}
                        </span>
                      </div>
                      <div className={`mt-2.5 space-y-0.5 text-[0.88rem] leading-5 md:text-[0.8rem] md:leading-5 ${MUTED_TEXT_CLASS_NAME}`}>
                        <p>{data.nearestTournament.activityName}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>{formatTournamentDate(data.nearestTournament.scheduledAt)}</span>
                          <MetaDivider />
                          <span className="inline-flex items-center gap-1.5">
                            <ParticipantsIcon />
                            {data.nearestTournament.participantsCount}/
                            {data.nearestTournament.maxParticipants}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Link
                      className="inline-flex items-center gap-2 text-[0.88rem] font-semibold text-blue-600 transition hover:text-blue-700"
                      href={`/tournaments/${data.nearestTournament.id}`}
                    >
                      <span>Открыть турнир</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between gap-6">
                  <div>
                    <h3 className="text-[1.3rem] font-semibold tracking-tight text-slate-900">
                      Вы пока не участвуете в турнирах.
                    </h3>
                    <p className={`mt-2 max-w-xl text-[0.9rem] leading-6 ${MUTED_TEXT_CLASS_NAME}`}>
                      Когда вы окажетесь среди участников или зарегистрированных игроков,
                      ближайший турнир появится здесь.
                    </p>
                  </div>

                  <div>
                    <DashboardButton fullWidth href={TOURNAMENTS_HREF}>
                      Перейти к турнирам
                    </DashboardButton>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle>Статистика за все время</SectionTitle>

            <PlayerHomeMobileStats
              elo={data.stats.elo !== null ? String(data.stats.elo) : "—"}
              losses={String(data.stats.losses)}
              matches={String(data.stats.matches)}
              place={data.stats.place ? `#${data.stats.place}` : "—"}
              winRate={`${data.stats.winRate}%`}
              wins={String(data.stats.wins)}
            />

            <div className="md:hidden">
              <MatchCtaButton fullWidth />
            </div>

            <div className="hidden space-y-2.5 md:block">
              <div className="grid grid-cols-2 gap-2.5">
                <StatCard accent label="Место" value={data.stats.place ? `#${data.stats.place}` : "—"} />
                <StatCard accent label="ELO" value={data.stats.elo !== null ? String(data.stats.elo) : "—"} />
              </div>

              <div className={`${SURFACE_SOFT_CLASS_NAME} overflow-hidden`}>
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  <CompactStat label="Win rate" value={`${data.stats.winRate}%`} />
                  <CompactStat label="Матчи" value={String(data.stats.matches)} />
                  <CompactStat label="Победы" value={String(data.stats.wins)} />
                  <CompactStat label="Поражения" value={String(data.stats.losses)} />
                </div>
              </div>

              <div className="pt-1.5">
                <MatchCtaButton className="w-full" />
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-5 pt-2 md:pt-3 lg:grid-cols-[minmax(0,1.34fr)_minmax(290px,0.9fr)] lg:items-start lg:gap-6">
          <section className="order-2 hidden space-y-3 md:block lg:order-1">
            <SectionTitle>Ваши турниры</SectionTitle>

            {data.tournaments.length > 0 ? (
              <div className="space-y-2.5">
                <div className="grid gap-3 md:grid-cols-2 md:gap-2.5">
                  {data.tournaments.map((tournament) => (
                    <PlayerTournamentCard key={tournament.id} tournament={tournament} />
                  ))}
                </div>

                <div>
                  <DashboardButton compact href={TOURNAMENTS_HREF}>
                    Все турниры
                  </DashboardButton>
                </div>
              </div>
            ) : (
              <div className={`${SURFACE_CLASS_NAME} px-5 py-6`}>
                <h3 className="text-[1.05rem] font-semibold tracking-tight text-slate-900">
                  Вы пока не участвуете в турнирах
                </h3>
                <p className={`mt-2 text-[0.9rem] leading-6 ${MUTED_TEXT_CLASS_NAME}`}>
                  Откройте список турниров, чтобы посмотреть доступные соревнования.
                </p>
                <div className="mt-5">
                  <DashboardButton fullWidth href={TOURNAMENTS_HREF}>
                    Все турниры
                  </DashboardButton>
                </div>
              </div>
            )}
          </section>

          <section className="order-1 space-y-3 lg:order-2">
            <SectionTitle>Изменения рейтинга</SectionTitle>

            <div className={`${SURFACE_CLASS_NAME} overflow-hidden`}>
              {data.ratingChanges.length > 0 ? (
                <PlayerRatingChangesList
                  items={data.ratingChanges.map((entry) => ({
                    delta: entry.delta,
                    id: entry.id,
                    opponentName: entry.opponentName,
                    subtitle: formatCompactDateTime(entry.occurredAt),
                  }))}
                />
              ) : (
                <div className="px-5 py-6">
                  <h3 className="text-[1.05rem] font-semibold tracking-tight text-slate-900">
                    Пока нет матчей, которые повлияли на рейтинг.
                  </h3>
                  <p className="mt-2 text-[0.9rem] leading-6 text-slate-500">
                    После первых обычных или турнирных матчей здесь появятся изменения Elo.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
