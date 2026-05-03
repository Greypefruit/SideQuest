import type { ReactNode } from "react";
import { getProfileById } from "@/src/db/queries";
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
  title?: string;
  children: ReactNode;
  className?: string;
};

function SectionCard({ title, children, className = "" }: SectionCardProps) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.035)] md:px-3.5 md:py-3.5 ${className}`.trim()}
    >
      {title ? (
        <>
          <div className="flex min-w-0 items-center gap-2 md:gap-2">
            <span
              aria-hidden="true"
              className="hidden h-5 w-1 rounded-[var(--radius-default)] bg-blue-600 md:block"
            />
            <h2 className="text-[1rem] font-semibold leading-none tracking-tight text-slate-800">
              {title}
            </h2>
          </div>
          <div className="mt-3">{children}</div>
        </>
      ) : (
        <div>{children}</div>
      )}
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

type MobileInlineReadOnlyFieldProps = {
  label: string;
  value: string;
};

function MobileInlineReadOnlyField({
  label,
  value,
}: MobileInlineReadOnlyFieldProps) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}: <span className="font-medium tracking-[0.04em] text-slate-400">{value}</span>
      </p>
    </div>
  );
}

type DesktopEditableFieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
};

function DesktopEditableField({
  label,
  name,
  defaultValue,
  placeholder,
}: DesktopEditableFieldProps) {
  return (
    <label className="block">
      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <input
        className="mt-2 min-h-7 w-full border-0 border-b border-slate-200 bg-transparent px-0 pb-1.5 pt-0 text-[0.88rem] font-medium leading-tight text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-0"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required
        type="text"
      />
    </label>
  );
}

type DesktopReadOnlyInlineFieldProps = {
  label: string;
  value: string;
};

function DesktopReadOnlyInlineField({ label, value }: DesktopReadOnlyInlineFieldProps) {
  return (
    <div>
      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}: <span className="font-medium tracking-[0.08em] text-slate-400">{value}</span>
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
  const params = await paramsPromise;
  const roleLabel = getRoleLabel(profile.role);

  return (
    <div className="mx-auto w-full max-w-[1040px] min-w-0 overflow-x-hidden">
      <div className="hidden md:block">
        <div className="mx-auto w-full max-w-[860px] space-y-3">
          <header>
            <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950">Профиль</h1>
          </header>

          <div className="space-y-6">
            <section className="space-y-3.5">
              <section className="overflow-hidden rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_8px_18px_rgba(15,23,42,0.025)]">
                <form action="/profile/name" className="space-y-5" method="post">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                    <DesktopEditableField
                      defaultValue={profile.firstName ?? ""}
                      label="Имя"
                      name="firstName"
                      placeholder="Введите имя"
                    />
                    <DesktopEditableField
                      defaultValue={profile.lastName ?? ""}
                      label="Фамилия"
                      name="lastName"
                      placeholder="Введите фамилию"
                    />
                    <DesktopReadOnlyInlineField label="Email" value={profile.email} />
                    <DesktopReadOnlyInlineField label="Роль" value={roleLabel} />
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="min-h-4 text-[0.74rem]">
                      {params.error === "required" ? (
                        <p className="text-rose-600">Укажите имя и фамилию.</p>
                      ) : params.saved === "1" ? (
                        <p className="text-emerald-600">Изменения сохранены.</p>
                      ) : null}
                    </div>

                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-default)] bg-blue-600 px-5 py-2 text-[0.82rem] font-medium text-white transition hover:bg-blue-700"
                      type="submit"
                    >
                      Сохранить изменения
                    </button>
                  </div>
                </form>
              </section>

              <div>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-default)] border border-rose-300 bg-white px-5 py-2 text-[0.82rem] font-semibold uppercase tracking-[0.02em] text-rose-600 transition hover:bg-rose-50"
                  >
                    Выйти из системы
                  </button>
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        <SectionCard>
          <form action="/profile/name" className="space-y-3.5" method="post">
            <div className="grid gap-3">
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
              <MobileInlineReadOnlyField label="Email" value={profile.email} />
              <MobileInlineReadOnlyField label="Роль" value={roleLabel} />
            </div>

            <div className="border-t border-slate-100 pt-2.5">
              <div className="min-h-4 text-[0.78rem]">
                {params.error === "required" ? (
                  <p className="text-rose-600">Укажите имя и фамилию.</p>
                ) : params.saved === "1" ? (
                  <p className="text-emerald-600">Изменения сохранены.</p>
                ) : null}
              </div>

              <button
                className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-[var(--radius-default)] bg-blue-600 px-3.5 py-2 text-[0.82rem] font-semibold text-white transition hover:bg-blue-700"
                type="submit"
              >
                Сохранить изменения
              </button>
            </div>
          </form>
        </SectionCard>

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex min-h-9 w-full items-center justify-center rounded-[var(--radius-default)] border border-rose-200 bg-white px-3 py-2 text-[0.78rem] font-semibold uppercase tracking-[0.03em] text-rose-600 transition hover:bg-rose-50"
          >
            Выйти из системы
          </button>
        </form>
      </div>
    </div>
  );
}
