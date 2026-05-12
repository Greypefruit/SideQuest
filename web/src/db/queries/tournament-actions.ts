import "server-only";

import { listPendingCompetitionMatchesByCompetitionIds } from "./competition-matches";
import { type DbExecutor } from "../index";
import { listCompetitionsByActivity } from "./competitions";
import {
  resolveTournamentRuntimeState,
  type TournamentStatus,
} from "@/src/tournaments/runtime-state";

type CompetitionSummaryEntry = Awaited<ReturnType<typeof listCompetitionsByActivity>>[number];
type PendingCompetitionMatchEntry = Awaited<
  ReturnType<typeof listPendingCompetitionMatchesByCompetitionIds>
>[number];

export type TournamentActionItem = {
  ctaHref: string;
  ctaLabel: "Внести результат" | "Запустить сетку";
  id: string;
  maxParticipants: number;
  participantsCount: number;
  statusLabel: "Ждет результат" | "Готов к старту";
  title: string;
};

function parseScheduledSortParts(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const scheduledAt = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  const startOfDay = new Date(
    scheduledAt.getFullYear(),
    scheduledAt.getMonth(),
    scheduledAt.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  const hasExplicitTime = scheduledAt.getHours() !== 0 || scheduledAt.getMinutes() !== 0;

  return {
    dayTimestamp: startOfDay,
    hasExplicitTime,
    timestamp: scheduledAt.getTime(),
  };
}

function compareDescDates(left: Date | null, right: Date | null) {
  const leftTimestamp = left?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rightTimestamp = right?.getTime() ?? Number.NEGATIVE_INFINITY;

  return rightTimestamp - leftTimestamp;
}

function compareScheduledAsc(left: CompetitionSummaryEntry, right: CompetitionSummaryEntry) {
  const leftScheduled = parseScheduledSortParts(left.competition.scheduledAt);
  const rightScheduled = parseScheduledSortParts(right.competition.scheduledAt);

  if (leftScheduled && rightScheduled) {
    if (leftScheduled.dayTimestamp !== rightScheduled.dayTimestamp) {
      return leftScheduled.dayTimestamp - rightScheduled.dayTimestamp;
    }

    if (leftScheduled.hasExplicitTime !== rightScheduled.hasExplicitTime) {
      return leftScheduled.hasExplicitTime ? -1 : 1;
    }

    if (leftScheduled.hasExplicitTime && rightScheduled.hasExplicitTime) {
      if (leftScheduled.timestamp !== rightScheduled.timestamp) {
        return leftScheduled.timestamp - rightScheduled.timestamp;
      }
    }
  } else if (leftScheduled || rightScheduled) {
    return leftScheduled ? -1 : 1;
  }

  const updatedAtComparison = compareDescDates(
    left.competition.updatedAt,
    right.competition.updatedAt,
  );

  if (updatedAtComparison !== 0) {
    return updatedAtComparison;
  }

  return compareDescDates(left.competition.createdAt, right.competition.createdAt);
}

function hasActionablePendingMatch(matches: PendingCompetitionMatchEntry[]) {
  return matches.some(
    (match) =>
      match.competitionMatch.resolutionType !== "bye" &&
      Boolean(
        match.competitionMatch.slot1ParticipantId && match.competitionMatch.slot2ParticipantId,
      ),
  );
}

function buildTournamentActionItem(
  entry: CompetitionSummaryEntry,
  pendingMatches: PendingCompetitionMatchEntry[],
): TournamentActionItem | null {
  const runtimeState = resolveTournamentRuntimeState({
    hasBracket: entry.matchesCount > 0,
    scheduledAt: entry.competition.scheduledAt,
    status: entry.competition.status as TournamentStatus,
  });

  if (
    runtimeState.effectiveStatus === "in_progress" &&
    hasActionablePendingMatch(pendingMatches)
  ) {
    return {
      ctaHref: `/tournaments/${entry.competition.id}?tab=bracket`,
      ctaLabel: "Внести результат",
      id: entry.competition.id,
      maxParticipants: entry.competition.maxParticipants,
      participantsCount: entry.participantsCount,
      statusLabel: "Ждет результат",
      title: entry.competition.title,
    } satisfies TournamentActionItem;
  }

  if (runtimeState.canGenerateBracket) {
    return {
      ctaHref: `/tournaments/${entry.competition.id}?tab=bracket`,
      ctaLabel: "Запустить сетку",
      id: entry.competition.id,
      maxParticipants: entry.competition.maxParticipants,
      participantsCount: entry.participantsCount,
      statusLabel: "Готов к старту",
      title: entry.competition.title,
    } satisfies TournamentActionItem;
  }

  return null;
}

export async function getTournamentActionItemsForCompetitions(
  competitions: CompetitionSummaryEntry[],
  database?: DbExecutor,
): Promise<TournamentActionItem[]> {
  const pendingMatches = await listPendingCompetitionMatchesByCompetitionIds(
    competitions.map((entry) => entry.competition.id),
    database,
  );
  const pendingMatchesByCompetitionId = new Map<string, PendingCompetitionMatchEntry[]>();

  for (const match of pendingMatches) {
    const items = pendingMatchesByCompetitionId.get(match.competition.id);

    if (items) {
      items.push(match);
      continue;
    }

    pendingMatchesByCompetitionId.set(match.competition.id, [match]);
  }

  return [...competitions]
    .sort(compareScheduledAsc)
    .map((entry) =>
      buildTournamentActionItem(
        entry,
        pendingMatchesByCompetitionId.get(entry.competition.id) ?? [],
      ),
    )
    .filter((entry): entry is TournamentActionItem => entry !== null);
}
