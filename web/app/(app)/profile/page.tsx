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
      className={`min-w-0 overflow-hidden rounded-[16px] border border-slate-200/90 bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.035)] md:px-3.5 md:py-3.5 ${className}`.trim()}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="h-5 w-1 rounded-full bg-blue-600" />
        <h2 className="text-[1rem] font-semibold leading-none tracking-tight text-slate-800">
          {title}
        </h2>
      </div>
      <div className="mt-3">{children}</div>
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
      <span className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </span>
      <input
        className="mt-1 min-h-7 w-full border-0 border-b border-slate-200 bg-transparent px-0 pb-1 pt-0 text-[0.96rem] font-medium leading-tight text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-0 md:text-[0.9rem]"
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
      <span className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </span>
      <p className="mt-1.5 break-words text-[0.84rem] font-medium leading-5 text-slate-500">
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
      <p className={`text-[1.3rem] font-semibold leading-none md:text-[1.2rem] ${valueClassName}`}>
        {value}
      </p>
      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
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
    <div className="mx-auto w-full max-w-[1040px] min-w-0 space-y-2.5 overflow-x-hidden md:space-y-3">
      <header className="hidden md:block">
        <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950">
          Настройки профиля
        </h1>
        <p className="mt-1 text-[0.86rem] leading-5 text-slate-500">
          Управляйте вашими персональными данными и отслеживайте статистику активности.
        </p>
      </header>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(250px,0.82fr)] lg:items-start">
        <div className="min-w-0 space-y-3">
          <SectionCard title="Основная информация">
            <form action="/profile/name" className="space-y-3.5" method="post">
              <div className="grid gap-3 md:grid-cols-2 md:gap-x-5 md:gap-y-5">
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

              <div className="border-t border-slate-100 pt-2.5 md:flex md:items-center md:justify-between md:gap-3 md:pt-3">
                <div className="min-h-4 text-[0.78rem]">
                  {params.error === "required" ? (
                    <p className="text-rose-600">Укажите имя и фамилию.</p>
                  ) : params.saved === "1" ? (
                    <p className="text-emerald-600">Изменения сохранены.</p>
                  ) : null}
                </div>

                <button
                  className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-full bg-blue-600 px-3.5 py-2 text-[0.82rem] font-semibold text-white transition hover:bg-blue-700 md:mt-0 md:w-auto md:min-w-[156px]"
                  type="submit"
                >
                  Сохранить изменения
                </button>
              </div>
            </form>
          </SectionCard>

          <div className="hidden md:block">
            <section className="rounded-[16px] border border-slate-200/90 bg-white px-3 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.035)]">
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex min-h-9 w-full items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.03em] text-rose-600 transition hover:bg-rose-50"
                >
                  Выйти из системы
                </button>
              </form>
            </section>
          </div>
        </div>

        <div className="min-w-0">
          <section className="min-w-0 overflow-hidden rounded-[16px] border border-slate-200/90 bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.035)] md:px-3.5 md:py-3.5">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
              Рейтинг Elo
            </p>
            <p className="mt-1.5 text-[1.6rem] font-semibold leading-none tracking-tight text-slate-800 md:text-[1.5rem]">
              {ratingValue}
            </p>
            <p className="mt-1 text-[0.82rem] leading-5 text-slate-500">{activityName}</p>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Metric label="Матчей" value={String(matchesPlayed)} />
                <Metric label="Побед" tone="accent" value={String(wins)} />
                <Metric label="Поражений" tone="danger" value={String(losses)} />
                <Metric label="Процент побед" value={winRate} />
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="md:hidden">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex min-h-9 w-full items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.03em] text-rose-600 transition hover:bg-rose-50"
          >
            Выйти из системы
          </button>
        </form>
      </div>
    </div>
  );
}
