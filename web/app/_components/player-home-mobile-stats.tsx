"use client";

import { useState } from "react";

const SURFACE_SOFT_CLASS_NAME =
  "rounded-[var(--radius-default)] border border-slate-200/80 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.025)]";

function ChevronUpIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="14"
      viewBox="0 0 14 14"
      width="14"
    >
      <path
        d="M3.5 8.75 7 5.25l3.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function MobilePrimaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={`${SURFACE_SOFT_CLASS_NAME} px-4 py-3.5 text-center`}>
      <p className="text-[0.63rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="mt-2.5 text-[1.65rem] font-semibold leading-none tracking-tight text-blue-600">
        {value}
      </p>
    </div>
  );
}

type PlayerHomeMobileStatsProps = {
  elo: string;
  losses: string;
  matches: string;
  place: string;
  winRate: string;
  wins: string;
};

export function PlayerHomeMobileStats({
  elo,
  losses,
  matches,
  place,
  winRate,
  wins,
}: PlayerHomeMobileStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2.5 md:hidden">
      <div className="grid grid-cols-2 gap-2.5">
        <MobilePrimaryStat label="Место" value={place} />
        <MobilePrimaryStat label="ELO" value={elo} />
      </div>

      <div className={`${SURFACE_SOFT_CLASS_NAME} overflow-hidden`}>
        <button
          aria-expanded={isExpanded}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          <span className="text-[0.82rem] font-semibold text-slate-700">Подробная статистика</span>
          <span className="flex h-4 w-4 items-center justify-center">
            <ChevronUpIcon
              className={`text-slate-500 transition ${
              isExpanded ? "rotate-180" : ""
            }`}
            />
          </span>
        </button>

        {isExpanded ? (
          <div className="border-t border-slate-100 px-3 py-3">
            <div className="grid grid-cols-4 overflow-hidden rounded-[var(--radius-default)] bg-white">
              <div className="px-2.5 py-1.5 text-center">
                <p className="text-[0.64rem] font-medium text-slate-500">Win rate</p>
                <p className="mt-1.5 text-[0.98rem] font-semibold leading-none tracking-tight text-slate-900">
                  {winRate}
                </p>
              </div>
              <div className="border-l border-slate-100 px-2.5 py-1.5 text-center">
                <p className="text-[0.64rem] font-medium text-slate-500">Матчи</p>
                <p className="mt-1.5 text-[0.98rem] font-semibold leading-none tracking-tight text-slate-900">
                  {matches}
                </p>
              </div>
              <div className="border-l border-slate-100 px-2.5 py-1.5 text-center">
                <p className="text-[0.64rem] font-medium text-slate-500">Победы</p>
                <p className="mt-1.5 text-[0.98rem] font-semibold leading-none tracking-tight text-slate-900">
                  {wins}
                </p>
              </div>
              <div className="border-l border-slate-100 px-2.5 py-1.5 text-center">
                <p className="text-[0.64rem] font-medium text-slate-500">Поражения</p>
                <p className="mt-1.5 text-[0.98rem] font-semibold leading-none tracking-tight text-slate-900">
                  {losses}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
