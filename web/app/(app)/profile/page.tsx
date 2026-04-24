import type { ReactNode } from "react";
import {
  getDefaultActivityType,
  getProfileById,
  getProfileRanking,
} from "@/src/db/queries";
import { requireCurrentViewer } from "@/src/auth/current-viewer";

function getRoleLabel(role: "player" | "organizer" | "admin") {
  switch (role) {
    case "player":
      return "Игрок";
    case "organizer":
      return "Организатор";
    case "admin":
      return "Администратор";
  }
}

function getWinRate(wins: number, matchesPlayed: number) {
  if (matchesPlayed <= 0) {
    return "0%";
  }

  return `${Math.round((wins / matchesPlayed) * 100)}%`;
}

type ProfilePageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type ProfileSearchParams = {
  error?: string;
  saved?: string;
};

type SectionCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

function SectionCard({ title, children, className = "" }: SectionCardProps) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.045)] md:px-5 md:py-5 ${className}`.trim()}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden="true" className="h-6 w-1 rounded-full bg-blue-600" />
        <h2 className="text-[1.28rem] font-semibold leading-none tracking-tight text-slate-800 md:text-[1.22rem]">
          {title}
        </h2>
      </div>
      <div className="mt-4 md:mt-5">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
};

function EditableField({ label, name, defaultValue, placeholder }: FieldProps) {
  return (
    <label className="block">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <input
        className="mt-1.5 min-h-8 w-full border-0 border-b border-slate-200 bg-transparent px-0 pb-1.5 pt-0 text-[1.2rem] font-medium leading-tight text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-0 md:text-[1.08rem]"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required
        type="text"
      />
    </label>
  );
}

type ReadOnlyFieldProps = {
  label: string;
  value: string;
};

function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <div className="min-w-0">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <p className="mt-2 break-words text-[0.98rem] font-medium leading-5 text-slate-500 md:text-[0.9rem]">
        {value}
      </p>
    </div>
  );
}

type MetricProps = {
  label: string;
  value: string;
  tone?: "default" | "accent" | "danger";
};

function Metric({ label, value, tone = "default" }: MetricProps) {
  const valueClassName =
    tone === "accent"
      ? "text-blue-600"
      : tone === "danger"
        ? "text-rose-600"
        : "text-slate-700";

  return (
    <div className="space-y-0.5">
      <p className={`text-[1.65rem] font-semibold leading-none md:text-[1.42rem] ${valueClassName}`}>
        {value}
      </p>
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const viewer = await requireCurrentViewer();
  const profile = await getProfileById(viewer.profileId);

  if (!profile) {
    return null;
  }

  const paramsPromise: Promise<ProfileSearchParams> = searchParams ?? Promise.resolve({});
  const activityType = await getDefaultActivityType();
  const activityTypeId = activityType?.id ?? null;

  const [profileRanking, params] = await Promise.all([
    activityTypeId ? getProfileRanking(profile.id, activityTypeId) : Promise.resolve(null),
    paramsPromise,
  ]);

  const ranking = profileRanking?.ranking ?? null;
  const roleLabel = getRoleLabel(profile.role);
  const activityName = activityType?.nameRu ?? "Настольный теннис";
  const ratingValue = ranking ? String(ranking.rating) : "—";
  const matchesPlayed = ranking?.matchesPlayed ?? 0;
  const wins = ranking?.wins ?? 0;
  const losses = ranking?.losses ?? 0;
  const winRate = getWinRate(wins, matchesPlayed);

  return (
    <div className="mx-auto w-full max-w-[1080px] min-w-0 space-y-4 overflow-x-hidden md:space-y-6">
      <header className="hidden md:block">
        <h1 className="text-[2.2rem] font-semibold tracking-tight text-slate-800 md:text-[1.8rem]">
          Настройки профиля
        </h1>
        <p className="mt-1.5 text-[0.98rem] text-slate-500 md:text-[0.88rem]">
          Управляйте вашими персональными данными и отслеживайте статистику активности.
        </p>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.82fr)] lg:items-start">
        <div className="min-w-0 space-y-4">
          <SectionCard title="Основная информация">
            <form action="/profile/name" className="space-y-4 md:space-y-5" method="post">
              <div className="grid gap-4 md:grid-cols-2 md:gap-x-7 md:gap-y-8">
                <EditableField
                  defaultValue={profile.firstName ?? ""}
                  label="Имя"
                  name="firstName"
                  placeholder="Введите имя"
                />
                <EditableField
                  defaultValue={profile.lastName ?? ""}
                  label="Фамилия"
                  name="lastName"
                  placeholder="Введите фамилию"
                />
                <ReadOnlyField label="Email (только чтение)" value={profile.email} />
                <ReadOnlyField label="Роль (только чтение)" value={roleLabel} />
              </div>

              <div className="border-t border-slate-100 pt-3 md:flex md:items-center md:justify-between md:gap-4 md:pt-4">
                <div className="min-h-4 text-[0.86rem]">
                  {params.error === "required" ? (
                    <p className="text-rose-600">Укажите имя и фамилию.</p>
                  ) : params.saved === "1" ? (
                    <p className="text-emerald-600">Изменения сохранены.</p>
                  ) : null}
                </div>

                <button
                  className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-[0.92rem] font-semibold text-white transition hover:bg-blue-700 md:mt-0 md:w-auto md:min-w-[182px]"
                  type="submit"
                >
                  Сохранить изменения
                </button>
              </div>
            </form>
          </SectionCard>

          <div className="hidden md:block">
            <section className="rounded-[18px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-none border border-rose-300 bg-white px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.04em] text-rose-600 transition hover:bg-rose-50"
                >
                  Выйти из системы
                </button>
              </form>
            </section>
          </div>
        </div>

        <div className="min-w-0">
          <SectionCard title="Активность и рейтинг">
            <div className="space-y-4">
              <div className="rounded-[18px] bg-slate-50 px-3.5 py-3.5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Текущая активность
                </p>
                <p className="mt-1.5 text-[1.18rem] font-semibold leading-tight text-slate-800 md:text-[1.02rem]">
                  {activityName}
                </p>
              </div>

              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Рейтинг Elo
                </p>
                <p className="mt-1.5 text-[2.4rem] font-semibold leading-none tracking-tight text-slate-800 md:text-[2rem]">
                  {ratingValue}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                  <Metric label="Матчей" value={String(matchesPlayed)} />
                  <Metric label="Побед" tone="accent" value={String(wins)} />
                  <Metric label="Поражений" tone="danger" value={String(losses)} />
                  <Metric label="Процент побед" value={winRate} />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="md:hidden">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-none border border-rose-300 bg-white px-4 py-2.5 text-[0.88rem] font-semibold uppercase tracking-[0.04em] text-rose-600 transition hover:bg-rose-50"
          >
            Выйти из системы
          </button>
        </form>
      </div>
    </div>
  );
}
