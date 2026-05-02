"use client";

import { TournamentBracketColumn } from "./tournament-bracket-column";

type BracketSlot = {
  displayName: string | null;
  participantId: string | null;
  seed: number | null;
};

type BracketMatch = {
  canSubmitResult: boolean;
  id: string;
  isFinal: boolean;
  matchNumber: number;
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

type BracketRound = {
  matches: BracketMatch[];
  roundNumber: number;
};

type TournamentBracketViewProps = {
  isPending: boolean;
  onOpenResult: (matchId: string) => void;
  rounds: BracketRound[];
};

const MATCH_HEIGHT = 104;
const BASE_VERTICAL_GAP = 24;
const COLUMN_WIDTH = 238;
const COLUMN_GAP = 64;

function getBracketColumnLabel(roundIndex: number, totalRounds: number) {
  const roundsToFinish = totalRounds - roundIndex - 1;

  if (roundsToFinish <= 0) {
    return "Финал";
  }

  if (roundsToFinish === 1) {
    return "1/2 финала";
  }

  return `Раунд ${roundIndex + 1}`;
}

function getMatchTop(roundIndex: number, originalIndex: number) {
  const baseStep = MATCH_HEIGHT + BASE_VERTICAL_GAP;
  const step = baseStep * 2 ** roundIndex;
  const offset = ((2 ** roundIndex) - 1) * baseStep * 0.5;

  return offset + originalIndex * step;
}

function getColumnHeight(roundIndex: number, originalMatchesCount: number) {
  if (originalMatchesCount <= 0) {
    return MATCH_HEIGHT;
  }

  return getMatchTop(roundIndex, originalMatchesCount - 1) + MATCH_HEIGHT;
}

export function TournamentBracketView({
  isPending,
  onOpenResult,
  rounds,
}: TournamentBracketViewProps) {
  const columns = rounds.map((round, roundIndex) => {
    const visibleMatches = round.matches.filter((match) => match.resolutionType !== "bye");
    const matchTops = visibleMatches.map((_, visibleIndex) => getMatchTop(roundIndex, visibleIndex));

    return {
      height: getColumnHeight(roundIndex, visibleMatches.length),
      label: getBracketColumnLabel(roundIndex, rounds.length),
      matchTops,
      matches: visibleMatches,
      roundNumber: round.roundNumber,
    };
  });

  const bracketHeight = Math.max(...columns.map((column) => column.height), MATCH_HEIGHT);
  const matchPositionMap = new Map<
    string,
    {
      centerY: number;
      columnIndex: number;
    }
  >();

  columns.forEach((column, columnIndex) => {
    column.matches.forEach((match, matchIndex) => {
      matchPositionMap.set(match.id, {
        centerY: (column.matchTops[matchIndex] ?? 0) + MATCH_HEIGHT / 2,
        columnIndex,
      });
    });
  });
  const totalWidth =
    columns.length * COLUMN_WIDTH + Math.max(columns.length - 1, 0) * COLUMN_GAP;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-max pr-4">
        <div style={{ width: `${totalWidth}px` }}>
          <div className="relative flex items-start" style={{ columnGap: `${COLUMN_GAP}px` }}>
            {columns.map((column, columnIndex) => (
              <TournamentBracketColumn
                key={column.roundNumber}
                cardWidth={COLUMN_WIDTH}
                columnHeight={bracketHeight}
                connectorGap={columnIndex < columns.length - 1 ? COLUMN_GAP : 0}
                connectorTargets={column.matches
                  .map((match, matchIndex) => {
                    if (!match.nextMatchId) {
                      return null;
                    }

                    const targetPosition = matchPositionMap.get(match.nextMatchId);

                    if (!targetPosition || targetPosition.columnIndex !== columnIndex + 1) {
                      return null;
                    }

                    return {
                      matchId: match.id,
                      sourceCenterY: (column.matchTops[matchIndex] ?? 0) + MATCH_HEIGHT / 2,
                      targetCenterY: targetPosition.centerY,
                    };
                  })
                  .filter((entry): entry is {
                    matchId: string;
                    sourceCenterY: number;
                    targetCenterY: number;
                  } => entry !== null)}
                isPending={isPending}
                label={column.label}
                matchTops={column.matchTops}
                matches={column.matches}
                onOpenResult={onOpenResult}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
