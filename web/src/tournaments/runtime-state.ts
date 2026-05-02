export type TournamentStatus =
  | "draft"
  | "registration"
  | "ready"
  | "in_progress"
  | "completed"
  | "cancelled";

type ResolveTournamentRuntimeStateInput = {
  hasBracket: boolean;
  now?: Date;
  scheduledAt: Date | string | null;
  status: TournamentStatus;
};

export type TournamentRuntimeState = {
  canGenerateBracket: boolean;
  effectiveStatus: TournamentStatus;
  hasBracket: boolean;
  hasReachedStart: boolean;
  isRegistrationOpen: boolean;
  isTerminal: boolean;
  shouldWarnMissingBracketAtStart: boolean;
  status: TournamentStatus;
};

function parseScheduledAt(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const scheduledAt = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  return scheduledAt;
}

export function resolveTournamentRuntimeState(
  input: ResolveTournamentRuntimeStateInput,
): TournamentRuntimeState {
  const scheduledAt = parseScheduledAt(input.scheduledAt);
  const now = input.now ?? new Date();
  const hasReachedStart =
    scheduledAt !== null && scheduledAt.getTime() <= now.getTime();
  const isTerminal = input.status === "completed" || input.status === "cancelled";

  let effectiveStatus = input.status;

  if (input.status === "ready" && input.hasBracket && hasReachedStart) {
    effectiveStatus = "in_progress";
  }

  return {
    canGenerateBracket: input.status === "ready" && !input.hasBracket,
    effectiveStatus,
    hasBracket: input.hasBracket,
    hasReachedStart,
    isRegistrationOpen: input.status === "registration",
    isTerminal,
    shouldWarnMissingBracketAtStart:
      input.status === "ready" && hasReachedStart && !input.hasBracket,
    status: input.status,
  };
}
