import type { TournamentRuntimeState } from "./runtime-state";

type TournamentListBadgeInput = {
  hasBracket: boolean;
  isViewerParticipant: boolean;
  runtimeState: TournamentRuntimeState;
};

type StatusTone = "slate" | "emerald" | "amber" | "blue" | "red";

type TournamentDisplayStatus = {
  label: string;
  tone: StatusTone;
};

function getToneClassName(tone: StatusTone) {
  switch (tone) {
    case "slate":
      return "border border-slate-300 bg-slate-100 text-slate-600";
    case "emerald":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "amber":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "blue":
      return "border border-blue-200 bg-white/85 text-blue-700";
    case "red":
      return "border border-red-200 bg-red-50 text-red-700";
  }
}

export function getTournamentDisplayStatus(
  runtimeState: TournamentRuntimeState,
): TournamentDisplayStatus {
  if (runtimeState.status === "draft") {
    return {
      label: "Черновик",
      tone: "slate",
    };
  }

  if (runtimeState.status === "registration") {
    return {
      label: "Регистрация открыта",
      tone: "emerald",
    };
  }

  if (runtimeState.effectiveStatus === "in_progress") {
    return {
      label: "Идет",
      tone: "blue",
    };
  }

  if (runtimeState.status === "completed") {
    return {
      label: "Завершен",
      tone: "slate",
    };
  }

  if (runtimeState.status === "cancelled") {
    return {
      label: "Отменен",
      tone: "red",
    };
  }

  if (runtimeState.status === "ready" && !runtimeState.hasBracket) {
    return {
      label: "Ждет сетку",
      tone: "amber",
    };
  }

  return {
    label: "Ожидает начала",
    tone: "amber",
  };
}

export function getTournamentStatusChipUi(runtimeState: TournamentRuntimeState) {
  const displayStatus = getTournamentDisplayStatus(runtimeState);

  return {
    className: getToneClassName(displayStatus.tone),
    label: displayStatus.label.toUpperCase(),
  };
}

export function getTournamentListBadge(input: TournamentListBadgeInput) {
  if (input.runtimeState.effectiveStatus === "in_progress") {
    return {
      className: getToneClassName("blue"),
      label: "ИДЕТ",
    };
  }

  if (input.runtimeState.status === "completed") {
    return {
      className: getToneClassName("slate"),
      label: "ЗАВЕРШЕН",
    };
  }

  if (input.runtimeState.status === "cancelled") {
    return {
      className: getToneClassName("red"),
      label: "ОТМЕНЕН",
    };
  }

  if (input.isViewerParticipant) {
    return {
      className: getToneClassName("blue"),
      label: "ВЫ УЧАСТНИК",
    };
  }

  if (input.runtimeState.status === "registration") {
    return {
      className: getToneClassName("emerald"),
      label: "РЕГИСТРАЦИЯ",
    };
  }

  if (input.runtimeState.status === "ready" && input.hasBracket) {
    return {
      className: getToneClassName("amber"),
      label: "ОЖИДАЕТ НАЧАЛА",
    };
  }

  return null;
}
