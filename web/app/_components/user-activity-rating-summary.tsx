import Link from "next/link";
import {
  getActivityRankingViewerPosition,
  getDefaultActivityType,
  getProfileRanking,
} from "@/src/db/queries";

type UserActivityRatingSummaryProps = {
  profileId: string;
};

function getWinRate(wins: number, matchesPlayed: number) {
  if (matchesPlayed <= 0) {
    return "0%";
  }

  return `${Math.round((wins / matchesPlayed) * 100)}%`;
}

type StatCardProps = {
  label: string;
  value: string;
  accent?: boolean;
};

function StatCard({ label, value, accent = false }: StatCardProps) {
  return (
    <div className="rounded-[var(--radius-default)] border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
      <p
        className={`text-[1.2rem] font-semibold leading-none tracking-tight ${
          accent ? "text-blue-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

export async function UserActivityRatingSummary({
  profileId,
}: UserActivityRatingSummaryProps) {
  const activityType = await getDefaultActivityType();
  const activityTypeId = activityType?.id ?? null;

  const [profileRanking, viewerPosition] = await Promise.all([
    activityTypeId ? getProfileRanking(profileId, activityTypeId) : Promise.resolve(null),
    activityTypeId ? getActivityRankingViewerPosition(activityTypeId, profileId) : Promise.resolve(null),
  ]);

  if (!activityType) {
    return (
      <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.035)] md:px-5 md:py-5">
        <h2 className="text-[1.05rem] font-semibold tracking-tight text-slate-900">
          Активность и рейтинг
        </h2>
        <p className="mt-1 max-w-xl text-[0.84rem] leading-5 text-slate-500">
          Данные активности пока недоступны. Когда они появятся, здесь отобразится ваш
          рейтинг и статистика.
        </p>
      </section>
    );
  }

  if (!profileRanking) {
    return (
      <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.035)] md:px-5 md:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-[1.05rem] font-semibold tracking-tight text-slate-900">
              Активность и рейтинг
            </h2>
            <p className="mt-1 max-w-xl text-[0.84rem] leading-5 text-slate-500">
              Для активности «{activityType.nameRu}» у вас пока нет статистики. Она появится
              после первых матчей.
            </p>
          </div>

          <Link
            href="/ranking"
            className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-3.5 py-2 text-[0.82rem] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Открыть рейтинг
          </Link>
        </div>
      </section>
    );
  }

  const ranking = profileRanking.ranking;
  const activityName = profileRanking.activityType.nameRu;
  const positionValue = viewerPosition ? `#${viewerPosition}` : "—";
  const ratingValue = String(ranking.rating);
  const matchesPlayed = ranking.matchesPlayed;
  const wins = ranking.wins;
  const losses = ranking.losses;
  const winRate = getWinRate(wins, matchesPlayed);

  return (
    <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.035)] md:px-5 md:py-5">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
            Dashboard
          </p>
          <h2 className="mt-1 text-[1.1rem] font-semibold tracking-tight text-slate-900 md:text-[1.2rem]">
            Активность и рейтинг
          </h2>
          <p className="mt-1 max-w-xl text-[0.84rem] leading-5 text-slate-500">
            Краткий обзор вашей позиции и текущей статистики по основной активности Release 1.
          </p>
        </div>

        <Link
          href="/ranking"
          className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-3.5 py-2 text-[0.82rem] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Открыть рейтинг
        </Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-[var(--radius-default)] border border-slate-200/80 bg-slate-50 px-3.5 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-slate-500 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              Активность
            </span>
            <span className="text-[0.92rem] font-semibold text-slate-800">{activityName}</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatCard accent label="Место" value={positionValue} />
            <StatCard accent label="Рейтинг" value={ratingValue} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Win rate" value={winRate} />
          <StatCard label="Матчи" value={String(matchesPlayed)} />
          <StatCard label="Победы" value={String(wins)} />
          <StatCard label="Поражения" value={String(losses)} />
        </div>
      </div>
    </section>
  );
}
