"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { createTournamentAction } from "../actions";

type CreateTournamentSheetProps = {
  closeHref: string;
  isOpen: boolean;
};

const INITIAL_FORM_STATE = {
  error: null as string | null,
};

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M4.5 4.5 13.5 13.5M13.5 4.5 4.5 13.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 22 22" width="22">
      <path
        d="M13.75 5.5 8.25 11l5.5 5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300 md:min-h-10 md:min-w-[170px] md:w-auto md:text-[0.86rem]"
    >
      {pending ? "Создаем турнир..." : "Создать турнир"}
    </button>
  );
}

export function CreateTournamentSheet({
  closeHref,
  isOpen,
}: CreateTournamentSheetProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(createTournamentAction, INITIAL_FORM_STATE);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(closeHref);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeHref, isOpen, router]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/45 backdrop-blur-[1px] md:items-center md:justify-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          router.push(closeHref);
        }
      }}
    >
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-12px_48px_rgba(15,23,42,0.18)] md:max-h-[calc(100dvh-4rem)] md:max-w-[560px] md:rounded-[18px] md:shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 md:px-5 md:py-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Закрыть создание турнира"
              className="inline-flex size-9 items-center justify-center rounded-full text-blue-600 transition hover:bg-blue-50 md:hidden"
              onClick={() => router.push(closeHref)}
            >
              <BackArrowIcon />
            </button>
            <div>
              <p className="text-[1.22rem] font-semibold tracking-tight text-slate-950 md:text-[1.28rem]">
                Создание турнира
              </p>
              <p className="hidden text-[0.82rem] text-slate-500 md:block">
                Быстро создайте черновик и продолжите настройку на странице турнира.
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Закрыть создание турнира"
            className="hidden items-center justify-center rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:inline-flex"
            onClick={() => router.push(closeHref)}
          >
            <CloseIcon />
          </button>
        </div>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
            <div className="space-y-2">
              <label
                htmlFor="title"
                className="block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                Название турнира
              </label>
              <input
                id="title"
                name="title"
                required
                maxLength={255}
                placeholder="Например, Весенний кубок"
                className="min-h-11 w-full rounded-[var(--radius-default)] border border-slate-200 px-3.5 text-[0.95rem] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:min-h-10 md:text-[0.92rem]"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3.5 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Активность
                </p>
                <p className="mt-1 text-[0.95rem] font-medium text-slate-900 md:text-[0.92rem]">
                  Настольный теннис
                </p>
              </div>

              <div className="rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3.5 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Формат турнира
                </p>
                <p className="mt-1 text-[0.95rem] font-medium text-slate-900 md:text-[0.92rem]">
                  На выбывание
                </p>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Формат матчей
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(["BO1", "BO3", "BO5"] as const).map((format, index) => (
                  <label key={format} className="block">
                    <input
                      defaultChecked={index === 1}
                      className="peer sr-only"
                      name="matchFormat"
                      type="radio"
                      value={format}
                    />
                    <span className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-slate-300 bg-white text-[0.92rem] font-semibold text-slate-600 transition peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-700 md:min-h-10 md:text-[0.88rem]">
                      {format}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="scheduledDate"
                  className="block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500"
                >
                  Дата
                </label>
                <input
                  id="scheduledDate"
                  name="scheduledDate"
                  type="date"
                  className="min-h-11 w-full rounded-[var(--radius-default)] border border-slate-200 px-3.5 text-[0.95rem] text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:min-h-10 md:text-[0.92rem]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="scheduledTime"
                  className="block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500"
                >
                  Время
                </label>
                <input
                  id="scheduledTime"
                  name="scheduledTime"
                  step={60}
                  type="time"
                  className="min-h-11 w-full rounded-[var(--radius-default)] border border-slate-200 px-3.5 text-[0.95rem] text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:min-h-10 md:text-[0.92rem]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="maxParticipants"
                className="block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                Лимит участников
              </label>
              <input
                id="maxParticipants"
                name="maxParticipants"
                type="number"
                min={2}
                defaultValue={16}
                className="min-h-11 w-full rounded-[var(--radius-default)] border border-slate-200 px-3.5 text-[0.95rem] text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:min-h-10 md:text-[0.92rem]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="location"
                className="block text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                Локация
              </label>
              <input
                id="location"
                name="location"
                maxLength={255}
                placeholder="Укажите место проведения"
                className="min-h-11 w-full rounded-[var(--radius-default)] border border-slate-200 px-3.5 text-[0.95rem] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:min-h-10 md:text-[0.92rem]"
              />
            </div>

            {state.error ? (
              <div className="rounded-[var(--radius-default)] border border-red-200 bg-red-50 px-3.5 py-3 text-[0.88rem] text-red-700">
                {state.error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 px-4 py-4 md:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link
                href={closeHref}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-4 text-[0.92rem] font-medium text-slate-600 transition hover:bg-slate-50 md:min-h-10 md:w-auto md:text-[0.86rem]"
              >
                Отмена
              </Link>
              <SubmitButton />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
