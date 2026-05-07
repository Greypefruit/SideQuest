import type { ReactNode } from "react";
import Link from "next/link";
import { getPlayerHomeData } from "@/src/db/queries";
import { PlayerHomeMobileStats } from "./player-home-mobile-stats";
import { PlayerRatingChangesList } from "./player-rating-changes-list";

const MATCHES_CTA_HREF = "/matches?create=1";
const TOURNAMENTS_HREF = "/tournaments";
const SURFACE_CLASS_NAME =
  "rounded-[var(--radius-default)] border border-slate-200/90 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.03)]";
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

function TournamentStatusChip({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-[var(--radius-default)] border border-blue-200 bg-blue-50 px-2.5 text-[0.74rem] font-medium text-blue-600">
      {label}
    </span>
  );
}

function DesktopStatsPanel({
  elo,
  losses,
  matches,
  place,
  winRate,
  wins,
}: {
  elo: string;
  losses: string;
  matches: string;
  place: string;
  winRate: string;
  wins: string;
}) {
  return (
    <div className={`${SURFACE_CLASS_NAME} overflow-hidden`}>
      <div className="grid grid-cols-2">
        <div className="px-4 py-4 text-center">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Место
          </p>
          <p className="mt-2 text-[1.6rem] font-semibold leading-none tracking-tight text-blue-600">
            {place}
          </p>
        </div>
        <div className="border-l border-slate-200 px-4 py-4 text-center">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Elo
          </p>
          <p className="mt-2 text-[1.6rem] font-semibold leading-none tracking-tight text-blue-600">
            {elo}
          </p>
        </div>
      </div>

      <div className="mx-4 border-t border-slate-200" />

      <div className="grid grid-cols-4">
        {[
          { label: "Win rate", value: winRate },
          { label: "Матчи", value: matches },
          { label: "Победы", value: wins },
          { label: "Поражения", value: losses },
        ].map((entry, index) => (
          <div
            key={entry.label}
            className={`px-3 py-4 text-center ${index > 0 ? "border-l border-slate-200" : ""}`}
          >
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {entry.label}
            </p>
            <p className="mt-2 text-[1.1rem] font-semibold leading-none tracking-tight text-slate-950">
              {entry.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TournamentParticipationCard({
  tournament,
  featured = false,
}: {
  tournament:
    | Awaited<ReturnType<typeof getPlayerHomeData>>["nearestTournament"]
    | Awaited<ReturnType<typeof getPlayerHomeData>>["tournaments"][number];
  featured?: boolean;
}) {
  if (!tournament) {
    return null;
  }

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className={`group block rounded-[var(--radius-default)] border px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition md:px-5 md:py-4.5 ${
        featured
          ? "border-blue-200 bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(255,255,255,0.98)_38%,rgba(191,219,254,0.45)_100%)] hover:border-blue-300 hover:bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(239,246,255,1)_42%,rgba(191,219,254,0.56)_100%)]"
          : "border-slate-200/90 bg-white hover:border-blue-200 hover:bg-blue-50"
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[1.02rem] font-semibold leading-5 tracking-tight text-slate-900">
            {tournament.title}
          </h3>
          {featured ? <TournamentStatusChip label={tournament.statusLabel} /> : null}
        </div>

        <div className={`mt-2 space-y-0.5 text-[0.86rem] leading-5 ${MUTED_TEXT_CLASS_NAME}`}>
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
    </Link>
  );
}

export async function PlayerHomeDashboard({ profileId }: PlayerHomeDashboardProps) {
  const data = await getPlayerHomeData(profileId);
  const participationTournaments = (
    data.nearestTournament ? [data.nearestTournament, ...data.tournaments] : data.tournaments
  ).slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-[1200px] min-w-0 overflow-x-hidden">
      <div className="space-y-5 pb-20 md:mx-auto md:max-w-[860px] md:pb-0 lg:space-y-4">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.34fr)_minmax(290px,0.9fr)] lg:items-start lg:gap-6">
          <section className="space-y-3">
            <SectionTitle>Участие в турнирах</SectionTitle>

            {participationTournaments.length > 0 ? (
              <div className="space-y-3">
                {participationTournaments.map((tournament, index) => (
                  <TournamentParticipationCard
                    key={tournament.id}
                    featured={index === 0}
                    tournament={tournament}
                  />
                ))}

                <div>
                  <DashboardButton compact href={TOURNAMENTS_HREF}>
                    Все турниры
                  </DashboardButton>
                </div>
              </div>
            ) : (
              <div className={`${SURFACE_CLASS_NAME} px-5 py-6`}>
                <h3 className="text-[1.3rem] font-semibold tracking-tight text-slate-900">
                  Вы пока не участвуете в турнирах.
                </h3>
                <p className={`mt-2 max-w-xl text-[0.9rem] leading-6 ${MUTED_TEXT_CLASS_NAME}`}>
                  Когда вы окажетесь среди участников или зарегистрированных игроков,
                  турниры появятся здесь.
                </p>

                <div className="mt-5">
                  <DashboardButton fullWidth href={TOURNAMENTS_HREF}>
                    Перейти к турнирам
                  </DashboardButton>
                </div>
              </div>
            )}
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
              <DesktopStatsPanel
                elo={data.stats.elo !== null ? String(data.stats.elo) : "—"}
                losses={String(data.stats.losses)}
                matches={String(data.stats.matches)}
                place={data.stats.place ? `#${data.stats.place}` : "—"}
                winRate={`${data.stats.winRate}%`}
                wins={String(data.stats.wins)}
              />

              <div className="pt-1.5">
                <MatchCtaButton className="w-full" />
              </div>
            </div>

            <div className="pt-2 md:pt-3">
              <SectionTitle>Изменения рейтинга</SectionTitle>
            </div>

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
