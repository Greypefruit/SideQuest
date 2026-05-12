"use client";

import Link from "next/link";
import { useState } from "react";

const INITIAL_VISIBLE_ITEMS = 5;

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

function ArrowUpIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
      <path
        d="M6 10V2M6 2 3.5 4.5M6 2l2.5 2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 12 12" width="12">
      <path
        d="M6 2v8M6 10 3.5 7.5M6 10l2.5-2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

type RatingChangeListItem = {
  delta: number;
  href?: string;
  id: string;
  opponentName: string;
  subtitle: string;
};

type PlayerRatingChangesListProps = {
  items: RatingChangeListItem[];
};

export function PlayerRatingChangesList({ items }: PlayerRatingChangesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasHiddenItems = items.length > INITIAL_VISIBLE_ITEMS;
  const visibleItems = isExpanded ? items : items.slice(0, INITIAL_VISIBLE_ITEMS);
  const hiddenCount = Math.max(0, items.length - INITIAL_VISIBLE_ITEMS);

  return (
    <>
      <div>
        {visibleItems.map((entry, index) => {
          const className = `flex items-stretch justify-between gap-4 px-4 py-3.5 transition-colors md:gap-3 md:px-4 md:py-2.5 ${
            entry.href
              ? "cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-inset"
              : ""
          } ${index > 0 ? "border-t border-slate-100" : ""}`;

          const content = (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[1rem] font-semibold tracking-tight text-slate-900 md:text-[0.94rem]">
                  {entry.opponentName}
                </p>
                <p className="mt-1 text-[0.78rem] font-medium uppercase tracking-[0.04em] text-slate-500 md:text-[0.66rem]">
                  {entry.subtitle}
                </p>
              </div>

              <div className="flex w-16 shrink-0 items-center justify-center md:w-14">
              <p
                className={`inline-flex items-center gap-1 text-center text-[1.18rem] font-semibold leading-none md:text-[1rem] ${
                  entry.delta >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {entry.delta >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
                {Math.abs(entry.delta)}
              </p>
            </div>
            </>
          );

          if (!entry.href) {
            return (
              <div key={entry.id} className={className}>
                {content}
              </div>
            );
          }

          return (
            <Link href={entry.href} key={entry.id} className={className}>
              {content}
            </Link>
          );
        })}
      </div>

      {hasHiddenItems ? (
        <div className="border-t border-slate-200 px-4 py-1.5">
          <button
            aria-expanded={isExpanded}
            className="inline-flex min-h-7 items-center justify-center gap-1.5 rounded-[var(--radius-default)] px-1.5 py-1 text-[0.78rem] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
          >
            <span>{isExpanded ? "Свернуть изменения" : `Еще ${hiddenCount} изменений`}</span>
            <span className="flex h-4 w-4 items-center justify-center">
              <ChevronUpIcon
                className={`text-slate-500 transition ${isExpanded ? "rotate-180" : ""}`}
              />
            </span>
          </button>
        </div>
      ) : null}
    </>
  );
}
