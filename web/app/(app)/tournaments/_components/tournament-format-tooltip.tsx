"use client";

const TOURNAMENT_FORMAT_HINT =
  "Турнир с посевом — это формат, в котором участники распределяются по сетке по силе. Благодаря этому более сильные игроки не встречаются друг с другом в первых матчах. Если участников меньше, чем нужно для полной сетки, часть игроков автоматически проходит дальше, но такие автопроходы бывают только в первом раунде.";

function InfoIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16" className="size-4">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 7.333v3M8 5.667h.007"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function TournamentFormatTooltip() {
  return (
    <span className="group/tooltip relative inline-flex">
      <button
        type="button"
        aria-label={TOURNAMENT_FORMAT_HINT}
        className="inline-flex size-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
      >
        <InfoIcon />
      </button>

      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden w-[min(18rem,calc(100vw-2rem))] rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-left text-[0.74rem] leading-5 text-slate-600 shadow-[0_14px_32px_rgba(15,23,42,0.12)] group-hover/tooltip:block group-focus-within/tooltip:block"
      >
        {TOURNAMENT_FORMAT_HINT}
      </span>
    </span>
  );
}
