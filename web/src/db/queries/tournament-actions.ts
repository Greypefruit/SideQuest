import "server-only";

import { getDefaultActivityType } from "./activity-types";
import { listPendingCompetitionMatchesByCompetitionIds } from "./competition-matches";
import { listCompetitionsByActivity, listCompetitionsByOwner } from "./competitions";
import {
  resolveTournamentRuntimeState,
  type TournamentStatus,
} from "@/src/tournaments/runtime-state";

type CompetitionSummaryEntry = Awaited<ReturnType<typeof listCompetitionsByActivity>>[number];
type OrganizerCompetitionEntry = Awaited<ReturnType<typeof listCompetitionsByOwner>>[number];
type PendingCompetitionMatchEntry = Awaited<
  ReturnType<typeof listPendingCompetitionMatchesByCompetitionIds>
>[number];

type TournamentActionItemKind =
  | "report_result"
  | "generate_bracket"
  | "starting_soon"
  | "registration_open";

type TournamentActionItemTone = "red" | "amber" | "blue" | "emerald";

export type TournamentActionItem = {
  ctaHref: string;
  ctaLabel: string;
  detailLine?: string;
  id: string;
  kind: TournamentActionItemKind;
  matchMeta?: {
    matchup: string;
    roundLabel: string;
  };
  priority: number;
  statusLabel: string;
  statusTone: TournamentActionItemTone;
  title: string;
  tournamentMeta: {
    count: number;
    max: number;
    scheduledAt: Date | null;
  };
};

type TournamentActionItemsOptions = {
  kinds?: TournamentActionItemKind[];
  limit?: number;
};

function compareDescDates(left: Date | null, right: Date | null) {
  const leftTimestamp = left?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rightTimestamp = right?.getTime() ?? Number.NEGATIVE_INFINITY;

  return rightTimestamp - leftTimestamp;
}

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

function getTournamentActionItemPriority(kind: TournamentActionItemKind) {
  switch (kind) {
    case "report_result":
      return 0;
    case "generate_bracket":
      return 1;
    case "starting_soon":
      return 2;
    case "registration_open":
      return 3;
  }
}

function getBracketSize(participantsCount: number) {
  let bracketSize = 1;

  while (bracketSize < participantsCount) {
    bracketSize *= 2;
  }

  return bracketSize;
}

function getRoundLabel(roundNumber: number, participantsCount: number) {
  if (participantsCount <= 1) {
    return `Раунд ${roundNumber}`;
  }

  const bracketSize = getBracketSize(participantsCount);
  const totalRounds = Math.max(1, Math.log2(bracketSize));
  const roundsRemaining = totalRounds - roundNumber;

  if (roundsRemaining <= 0) {
    return "Финал";
  }

  if (roundsRemaining === 1) {
    return "1/2 финала";
  }

  if (roundsRemaining === 2) {
    return "1/4 финала";
  }

  if (roundsRemaining === 3) {
    return "1/8 финала";
  }

  return `Раунд ${roundNumber}`;
}

function formatResultSubtitle(
  entry: OrganizerCompetitionEntry,
  match: PendingCompetitionMatchEntry | null,
) {
  if (!match) {
    return null;
  }

  const slot1Name = match.slot1Profile?.displayName?.trim();
  const slot2Name = match.slot2Profile?.displayName?.trim();

  if (!slot1Name || !slot2Name) {
    return null;
  }

  return {
    matchup: `${slot1Name} vs ${slot2Name}`,
    roundLabel: getRoundLabel(match.competitionMatch.roundNumber, entry.participantsCount),
  };
}

function getActionablePendingMatch(matches: PendingCompetitionMatchEntry[]) {
  return (
    matches.find(
      (match) =>
        match.competitionMatch.resolutionType !== "bye" &&
        Boolean(
          match.competitionMatch.slot1ParticipantId && match.competitionMatch.slot2ParticipantId,
        ),
    ) ?? null
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
  const actionableMatch = getActionablePendingMatch(pendingMatches);

  if (runtimeState.effectiveStatus === "in_progress" && actionableMatch) {
    const resultMeta = formatResultSubtitle(entry, actionableMatch);

    return {
      ctaHref: `/tournaments/${entry.competition.id}?tab=bracket`,
      ctaLabel: "Внести результат",
      id: entry.competition.id,
      kind: "report_result",
      matchMeta: resultMeta ?? {
        matchup: "Есть матч, ожидающий результат",
        roundLabel: "Ожидает результат",
      },
      priority: getTournamentActionItemPriority("report_result"),
      statusLabel: "Нужно внести результат",
      statusTone: "red",
      title: entry.competition.title,
      tournamentMeta: {
        count: entry.participantsCount,
        max: entry.competition.maxParticipants,
        scheduledAt: entry.competition.scheduledAt,
      },
    };
  }

  if (runtimeState.canGenerateBracket) {
    return {
      ctaHref: `/tournaments/${entry.competition.id}?tab=bracket`,
      ctaLabel: "Сгенерировать сетку",
      detailLine: "Регистрация завершена",
      id: entry.competition.id,
      kind: "generate_bracket",
      priority: getTournamentActionItemPriority("generate_bracket"),
      statusLabel: "Нужна сетка",
      statusTone: "amber",
      title: entry.competition.title,
      tournamentMeta: {
        count: entry.participantsCount,
        max: entry.competition.maxParticipants,
        scheduledAt: entry.competition.scheduledAt,
      },
    };
  }

  if (
    entry.matchesCount > 0 &&
    (runtimeState.status === "ready" ||
      (runtimeState.status === "in_progress" && !runtimeState.hasReachedStart))
  ) {
    return {
      ctaHref: `/tournaments/${entry.competition.id}`,
      ctaLabel: "Открыть турнир",
      id: entry.competition.id,
      kind: "starting_soon",
      priority: getTournamentActionItemPriority("starting_soon"),
      statusLabel: "Скоро начнется",
      statusTone: "blue",
      title: entry.competition.title,
      tournamentMeta: {
        count: entry.participantsCount,
        max: entry.competition.maxParticipants,
        scheduledAt: entry.competition.scheduledAt,
      },
    };
  }

  if (runtimeState.status === "registration") {
    return {
      ctaHref: `/tournaments/${entry.competition.id}`,
      ctaLabel: "Открыть турнир",
      id: entry.competition.id,
      kind: "registration_open",
      priority: getTournamentActionItemPriority("registration_open"),
      statusLabel: "Открыта регистрация",
      statusTone: "emerald",
      title: entry.competition.title,
      tournamentMeta: {
        count: entry.participantsCount,
        max: entry.competition.maxParticipants,
        scheduledAt: entry.competition.scheduledAt,
      },
    };
  }

  return null;
}

export async function getTournamentActionItemsForCompetitions(
  competitions: CompetitionSummaryEntry[],
  options?: TournamentActionItemsOptions,
) {
  const pendingMatches = await listPendingCompetitionMatchesByCompetitionIds(
    competitions.map((entry) => entry.competition.id),
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

  const allowedKinds = options?.kinds ? new Set(options.kinds) : null;

  const actionItems = [...competitions]
    .sort(compareScheduledAsc)
    .map((entry) =>
      buildTournamentActionItem(
        entry,
        pendingMatchesByCompetitionId.get(entry.competition.id) ?? [],
      ),
    )
    .filter((entry): entry is TournamentActionItem => {
      if (!entry) {
        return false;
      }

      return allowedKinds ? allowedKinds.has(entry.kind) : true;
    })
    .sort((left, right) => {
      const priorityDifference = left.priority - right.priority;

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return 0;
    });

  return typeof options?.limit === "number" ? actionItems.slice(0, options.limit) : actionItems;
}

export async function getOwnedTournamentActionItems(profileId: string, limit?: number) {
  const activityType = await getDefaultActivityType();

  if (!activityType) {
    return [] as TournamentActionItem[];
  }

  const competitions = await listCompetitionsByOwner(profileId, activityType.id, {
    statuses: ["registration", "ready", "in_progress"],
  });

  return getTournamentActionItemsForCompetitions(competitions, { limit });
}
