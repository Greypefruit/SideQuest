"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createTournamentAction } from "../actions";

type MatchFormat = "BO1" | "BO3" | "BO5";

type CreateTournamentFormState = {
  error: string | null;
};

const INITIAL_FORM_STATE: CreateTournamentFormState = {
  error: null,
};

const MATCH_FORMAT_OPTIONS: MatchFormat[] = ["BO1", "BO3", "BO5"];

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

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-default)] bg-blue-600 px-4 text-[0.95rem] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Создание..." : "Создать турнир"}
    </button>
  );
}

type FieldLabelProps = {
  children: string;
};

function FieldLabel({ children }: FieldLabelProps) {
  return (
    <label className="block text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {children}
    </label>
  );
}

type ReadOnlyFieldProps = {
  label: string;
  value: string;
};

function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <div className="rounded-[var(--radius-default)] border border-slate-200 bg-slate-50/60 px-3 py-3">
      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 text-[0.98rem] font-medium text-slate-800">{value}</p>
    </div>
  );
}

export function CreateTournamentSheet() {
  return <CreateTournamentSheetInner closeHref="/tournaments?tab=my" />;
}

type CreateTournamentSheetProps = {
  closeHref: string;
};

export function CreateTournamentSheetInner({ closeHref }: CreateTournamentSheetProps) {
  const [state, formAction] = useActionState(createTournamentAction, INITIAL_FORM_STATE);
  const [title, setTitle] = useState("");
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("BO3");

  const isSubmitDisabled = title.trim().length === 0 || !matchFormat;

  return (
    <div
      className="fixed inset-0 z-50 bg-white md:flex md:items-center md:justify-center md:bg-slate-950/38 md:p-4"
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          window.matchMedia("(min-width: 768px)").matches
        ) {
          window.location.href = closeHref;
        }
      }}
      role="presentation"
    >
      <section className="flex min-h-screen w-full flex-col bg-white md:min-h-0 md:max-h-[min(92vh,760px)] md:max-w-[32.5rem] md:overflow-hidden md:rounded-[var(--radius-default)] md:border md:border-slate-200/90 md:shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-4 md:px-5 md:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={closeHref}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-default)] text-blue-600 transition hover:bg-blue-50 md:hidden"
            >
              <BackArrowIcon />
            </Link>

            <h1 className="text-[1.95rem] font-semibold tracking-tight text-slate-950 md:text-[1.55rem]">
              Создание турнира
            </h1>
          </div>

          <Link
            href={closeHref}
            className="hidden h-9 w-9 items-center justify-center rounded-[var(--radius-default)] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:inline-flex"
          >
            <CloseIcon />
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          <form action={formAction} className="space-y-5 md:space-y-4.5">
            <div className="space-y-2.5">
              <FieldLabel>Название турнира *</FieldLabel>
              <input
                className="min-h-12 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white px-3 text-[1rem] font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                id="title"
                name="title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например, Весенний кубок"
                type="text"
                value={title}
              />
            </div>

            <div className="grid gap-3">
              <ReadOnlyField label="Активность" value="Настольный теннис" />
              <ReadOnlyField label="Формат турнира" value="На выбывание" />
            </div>

            <div className="space-y-2.5">
              <FieldLabel>Формат матчей *</FieldLabel>
              <input name="matchFormat" type="hidden" value={matchFormat} />

              <div className="grid grid-cols-3 gap-2">
                {MATCH_FORMAT_OPTIONS.map((option) => {
                  const isActive = option === matchFormat;

                  return (
                    <button
                      key={option}
                      className={`inline-flex min-h-12 items-center justify-center rounded-[var(--radius-default)] border text-[0.95rem] font-semibold transition ${
                        isActive
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => setMatchFormat(option)}
                      type="button"
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2.5">
                <FieldLabel>Дата (опционально)</FieldLabel>
                <input
                  className="min-h-12 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white px-3 text-[0.96rem] font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  id="scheduledDate"
                  lang="ru-RU"
                  name="scheduledDate"
                  type="date"
                />
              </div>

              <div className="space-y-2.5">
                <FieldLabel>Время (опционально)</FieldLabel>
                <input
                  className="min-h-12 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white px-3 text-[0.96rem] font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  id="scheduledTime"
                  lang="ru-RU"
                  name="scheduledTime"
                  step={60}
                  type="time"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <FieldLabel>Локация (опционально)</FieldLabel>
              <input
                className="min-h-12 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white px-3 text-[0.96rem] font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                id="location"
                name="location"
                placeholder="Укажите место проведения"
                type="text"
              />
            </div>

            {state.error ? (
              <p className="rounded-[var(--radius-default)] border border-red-200 bg-red-50 px-3 py-2 text-[0.88rem] text-red-700">
                {state.error}
              </p>
            ) : null}

            <div className="pt-1 md:pt-2">
              <SubmitButton disabled={isSubmitDisabled} />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
