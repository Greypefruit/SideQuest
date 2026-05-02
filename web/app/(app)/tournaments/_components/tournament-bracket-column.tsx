"use client";

import { TournamentBracketMatch } from "./tournament-bracket-match";

type BracketSlot = {
  displayName: string | null;
  participantId: string | null;
  seed: number | null;
};

type BracketMatch = {
  canSubmitResult: boolean;
  id: string;
  isFinal: boolean;
  nextMatchId: string | null;
  resolutionType: "bye" | "played" | null;
  roundNumber: number;
  slot1: BracketSlot;
  slot1Score: number | null;
  slot2: BracketSlot;
  slot2Score: number | null;
  status: "completed" | "pending";
  winnerParticipantId: string | null;
};

type TournamentBracketColumnProps = {
  cardWidth: number;
  columnHeight: number;
  connectorGap: number;
  connectorTargets: Array<{
    matchId: string;
    sourceCenterY: number;
    targetCenterY: number;
  }>;
  isPending: boolean;
  label: string;
  matchTops: number[];
  matches: BracketMatch[];
  onOpenResult: (matchId: string) => void;
};

export function TournamentBracketColumn({
  cardWidth,
  columnHeight,
  connectorGap,
  connectorTargets,
  isPending,
  label,
  matchTops,
  matches,
  onOpenResult,
}: TournamentBracketColumnProps) {
  return (
    <div className="shrink-0">
      <div className="flex h-10 items-center">
        <h3 className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </h3>
      </div>

      <div
        className="relative mt-4 overflow-visible"
        style={{ height: `${columnHeight}px`, width: `${cardWidth}px` }}
      >
        {connectorTargets.length > 0 ? (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-0 overflow-visible"
            width={cardWidth + connectorGap}
            height={columnHeight}
            viewBox={`0 0 ${cardWidth + connectorGap} ${columnHeight}`}
          >
            {connectorTargets.map((connector) => {
              const sourceX = cardWidth;
              const targetX = cardWidth + connectorGap;
              const midX = sourceX + Math.min(28, Math.max(targetX - sourceX, 0) / 2);
              const path = `M ${sourceX} ${connector.sourceCenterY} H ${midX} V ${connector.targetCenterY} H ${targetX}`;

              return (
                <path
                  key={`${connector.matchId}-connector`}
                  d={path}
                  fill="none"
                  stroke="rgb(203 213 225)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
        ) : null}

        {matches.map((match, index) => (
          <div
            key={match.id}
            className="absolute left-0 right-0 z-10"
            style={{ top: `${matchTops[index] ?? 0}px` }}
          >
            <TournamentBracketMatch
              isPending={isPending}
              match={match}
              onOpenResult={onOpenResult}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
