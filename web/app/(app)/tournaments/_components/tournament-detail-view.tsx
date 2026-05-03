"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addTournamentParticipantAction,
  cancelTournamentAction,
  closeTournamentRegistrationAction,
  deleteTournamentDraftAction,
  generateTournamentBracketAction,
  moveTournamentToReadyAction,
  openTournamentRegistrationAction,
  registerToTournamentAction,
  removeTournamentParticipantAction,
  saveTournamentMatchResultAction,
  unregisterFromTournamentAction,
  updateTournamentDraftAction,
} from "../actions";
import { type TournamentRuntimeState, type TournamentStatus } from "@/src/tournaments/runtime-state";
import {
  getTournamentStatusChipUi,
} from "@/src/tournaments/display-state";
import { TournamentBracketView } from "./tournament-bracket-view";
import { TournamentFormatTooltip } from "./tournament-format-tooltip";
type TournamentTab = "overview" | "participants" | "bracket";
type MatchFormat = "BO1" | "BO3" | "BO5";
type WinnerKey = "player1" | "player2";

type TournamentParticipant = {
  competitionParticipantId: string;
  displayName: string;
  losses: number;
  matchesPlayed: number;
  participantId: string;
  rating: number | null;
  seed: number | null;
  wins: number;
};

type ParticipantOption = {
  displayName: string;
  participantId: string;
};

type TournamentBracketMatch = {
  canSubmitResult: boolean;
  id: string;
  isFinal: boolean;
  matchNumber: number;
  nextMatchId: string | null;
  resolutionType: "bye" | "played" | null;
  roundNumber: number;
  slot1: {
    displayName: string | null;
    participantId: string | null;
    seed: number | null;
  };
  slot1Score: number | null;
  slot2: {
    displayName: string | null;
    participantId: string | null;
    seed: number | null;
  };
  slot2Score: number | null;
  status: "completed" | "pending";
  winnerParticipantId: string | null;
};

type TournamentRound = {
  completedMatches: number;
  label: string;
  matches: TournamentBracketMatch[];
  matchesCount: number;
  pendingMatches: number;
  roundNumber: number;
};

type TournamentDetailViewProps = {
  closeHref: string;
  competition: {
    activityName: string;
    id: string;
    location: string | null;
    matchFormat: MatchFormat;
    maxParticipants: number;
    organizerName: string | null;
    scheduledAt: string | null;
    status: TournamentStatus;
    title: string;
  };
  participantOptions: ParticipantOption[];
  participants: TournamentParticipant[];
  permissions: {
    canCancelTournament: boolean;
    canCloseRegistration: boolean;
    canDeleteTournament: boolean;
    canEditDraft: boolean;
    canGenerateBracket: boolean;
    canManageParticipantAdd: boolean;
    canManageParticipantRemove: boolean;
    canManageResults: boolean;
    canManageTournament: boolean;
    canMoveToReady: boolean;
    canOpenRegistration: boolean;
    isAdmin: boolean;
    isOrganizerOwner: boolean;
  };
  rounds: TournamentRound[];
  runtimeState: TournamentRuntimeState;
  viewerRegistration: {
    canSelfRegister: boolean;
    isViewerRegistered: boolean;
    viewerParticipantId: string | null;
  };
};

type DraftOverviewEditorProps = {
  canCancelTournament: boolean;
  canDeleteTournament: boolean;
  activityName: string;
  competitionId: string;
  initialLocation: string | null;
  initialMatchFormat: MatchFormat;
  initialMaxParticipants: number;
  initialOrganizerName: string;
  initialScheduledAt: string | null;
  title: string;
  isEditable: boolean;
};

type MatchScore = {
  player1: number;
  player2: number;
};

const SCORE_OPTIONS: Record<MatchFormat, MatchScore[]> = {
  BO1: [
    { player1: 1, player2: 0 },
    { player1: 0, player2: 1 },
  ],
  BO3: [
    { player1: 2, player2: 0 },
    { player1: 2, player2: 1 },
    { player1: 0, player2: 2 },
    { player1: 1, player2: 2 },
  ],
  BO5: [
    { player1: 3, player2: 0 },
    { player1: 3, player2: 1 },
    { player1: 3, player2: 2 },
    { player1: 0, player2: 3 },
    { player1: 1, player2: 3 },
    { player1: 2, player2: 3 },
  ],
};

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

function parseScheduledInput(value: string | null) {
  if (!value) {
    return {
      date: "",
      time: "",
    };
  }

  const scheduledAt = new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    return {
      date: "",
      time: "",
    };
  }

  const year = String(scheduledAt.getFullYear());
  const month = String(scheduledAt.getMonth() + 1).padStart(2, "0");
  const day = String(scheduledAt.getDate()).padStart(2, "0");
  const hours = String(scheduledAt.getHours()).padStart(2, "0");
  const minutes = String(scheduledAt.getMinutes()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: hours === "00" && minutes === "00" ? "" : `${hours}:${minutes}`,
  };
}

function formatScheduledDate(value: string | null) {
  if (!value) {
    return "Не указана";
  }

  const scheduledAt = new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    return "Не указана";
  }

  const day = String(scheduledAt.getDate()).padStart(2, "0");
  const month = String(scheduledAt.getMonth() + 1).padStart(2, "0");
  const year = String(scheduledAt.getFullYear());

  return `${day}.${month}.${year}`;
}

function formatScheduledTime(value: string | null) {
  if (!value) {
    return "Не указано";
  }

  const scheduledAt = new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    return "Не указано";
  }

  const hours = String(scheduledAt.getHours()).padStart(2, "0");
  const minutes = String(scheduledAt.getMinutes()).padStart(2, "0");

  if (hours === "00" && minutes === "00") {
    return "Не указано";
  }

  return `${hours}:${minutes}`;
}

function getDefaultWinningScore(format: MatchFormat, winnerKey: WinnerKey): MatchScore {
  switch (format) {
    case "BO1":
      return winnerKey === "player1"
        ? { player1: 1, player2: 0 }
        : { player1: 0, player2: 1 };
    case "BO3":
      return winnerKey === "player1"
        ? { player1: 2, player2: 0 }
        : { player1: 0, player2: 2 };
    case "BO5":
      return winnerKey === "player1"
        ? { player1: 3, player2: 0 }
        : { player1: 0, player2: 3 };
  }
}

function getWinRate(wins: number, matchesPlayed: number) {
  if (matchesPlayed <= 0) {
    return "0%";
  }

  return `${Math.round((wins / matchesPlayed) * 100)}%`;
}

function formatStateStartDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const scheduledAt = new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  const day = String(scheduledAt.getDate()).padStart(2, "0");
  const month = String(scheduledAt.getMonth() + 1).padStart(2, "0");
  const year = String(scheduledAt.getFullYear());
  const hours = String(scheduledAt.getHours()).padStart(2, "0");
  const minutes = String(scheduledAt.getMinutes()).padStart(2, "0");

  if (hours === "00" && minutes === "00") {
    return `${day}.${month}.${year}`;
  }

  return `${day}.${month}.${year} в ${hours}:${minutes}`;
}

function getTodayDateInputValue() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCompletedTournamentSummary(rounds: TournamentRound[]) {
  const finalRound = rounds.at(-1);
  const finalMatch = finalRound?.matches[0];

  if (!finalMatch || finalMatch.status !== "completed" || !finalMatch.winnerParticipantId) {
    return {
      winnerName: null,
    };
  }

  const winnerName =
    finalMatch.winnerParticipantId === finalMatch.slot1.participantId
      ? finalMatch.slot1.displayName
      : finalMatch.slot2.displayName;

  return {
    winnerName: winnerName ?? null,
  };
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center rounded-[var(--radius-default)] px-4 text-[0.88rem] font-semibold transition ${
        active
          ? "bg-blue-500 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function DraftOverviewEditor({
  canCancelTournament,
  canDeleteTournament,
  activityName,
  competitionId,
  initialLocation,
  initialMatchFormat,
  initialMaxParticipants,
  initialOrganizerName,
  initialScheduledAt,
  title,
  isEditable,
}: DraftOverviewEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialScheduled = parseScheduledInput(initialScheduledAt);
  const [matchFormat, setMatchFormat] = useState<MatchFormat>(initialMatchFormat);
  const [maxParticipants, setMaxParticipants] = useState(String(initialMaxParticipants));
  const [scheduledDate, setScheduledDate] = useState(initialScheduled.date);
  const [scheduledTime, setScheduledTime] = useState(initialScheduled.time);
  const [location, setLocation] = useState(initialLocation ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const minScheduledDate = getTodayDateInputValue();
  const dateValue = formatScheduledDate(initialScheduledAt);
  const timeValue = formatScheduledTime(initialScheduledAt);
  const destructiveButtonLabel = canDeleteTournament ? "Удалить турнир" : "Отменить турнир";

  const desktopRows = [
    {
      label: "Активность",
      value: (
        <p className="text-[0.84rem] font-semibold text-slate-800">{activityName}</p>
      ),
    },
    {
      label: "Формат турнира",
      value: (
        <div className="flex items-center gap-2">
          <p className="text-[0.84rem] font-semibold text-slate-800">
            На выбывание (Посев)
          </p>
          <TournamentFormatTooltip />
        </div>
      ),
    },
    {
      label: "Формат матча",
      value: isEditable ? (
        <div className="flex flex-wrap gap-2">
          {(["BO1", "BO3", "BO5"] as const).map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => setMatchFormat(format)}
              className={`inline-flex min-h-9 items-center justify-center rounded-[var(--radius-default)] border px-3 text-[0.82rem] font-semibold transition ${
                matchFormat === format
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {format}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[0.84rem] font-semibold text-slate-800">{initialMatchFormat}</p>
      ),
    },
    {
      label: "Дата и время",
      value: isEditable ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            id="tournament-date"
            min={minScheduledDate}
            type="date"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            className="min-h-10 w-full rounded-[var(--radius-default)] border border-slate-200 px-3 text-[0.84rem] text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <input
            id="tournament-time"
            step={60}
            type="time"
            value={scheduledTime}
            onChange={(event) => setScheduledTime(event.target.value)}
            className="min-h-10 w-full rounded-[var(--radius-default)] border border-slate-200 px-3 text-[0.84rem] text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      ) : (
        <p className="text-[0.84rem] font-semibold text-slate-800">
          {dateValue} · {timeValue}
        </p>
      ),
    },
    {
      label: "Участники",
      value: isEditable ? (
        <div className="max-w-[180px]">
          <input
            id="tournament-max-participants"
            type="number"
            min={2}
            value={maxParticipants}
            onChange={(event) => setMaxParticipants(event.target.value)}
            className="min-h-10 w-full rounded-[var(--radius-default)] border border-slate-200 px-3 text-[0.84rem] text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      ) : (
        <p className="text-[0.84rem] font-semibold text-slate-800">{initialMaxParticipants}</p>
      ),
    },
    {
      label: "Локация",
      value: isEditable ? (
        <input
          id="tournament-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Укажите место проведения"
          className="min-h-10 w-full rounded-[var(--radius-default)] border border-slate-200 px-3 text-[0.84rem] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <p className="text-[0.84rem] font-semibold text-slate-800">
          {initialLocation?.trim() ? initialLocation : "Не указана"}
        </p>
      ),
    },
    {
      label: "Организатор",
      value: (
        <p className="text-[0.84rem] font-semibold text-slate-800">{initialOrganizerName}</p>
      ),
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="hidden rounded-[var(--radius-default)] border border-slate-200/90 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <tbody>
              {desktopRows.map((row) => (
                <tr key={row.label} className="border-t border-slate-100 align-top first:border-t-0">
                  <td className="px-3.5 py-3 text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {row.label}
                  </td>
                  <td className="px-3.5 py-3">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="space-y-2 md:hidden">
        {desktopRows.map((row) => (
          <div
            key={row.label}
            className="rounded-[var(--radius-default)] border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {row.label}
            </p>
            <div className="mt-2">{row.value}</div>
          </div>
        ))}
      </section>

      {message ? (
        <div className="rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3.5 py-3 text-[0.88rem] text-slate-600">
          {message}
        </div>
      ) : null}

      {isEditable || canDeleteTournament || canCancelTournament ? (
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {canDeleteTournament || canCancelTournament ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (canDeleteTournament) {
                    if (!window.confirm("Удалить турнир? Это действие нельзя отменить.")) {
                      return;
                    }

                    startTransition(async () => {
                      const result = await deleteTournamentDraftAction({ competitionId });

                      setMessage(result.message ?? null);

                      if (result.ok) {
                        router.push("/tournaments?tab=my");
                        router.refresh();
                      }
                    });

                    return;
                  }

                  if (
                    !window.confirm(
                      "Отменить турнир?\n\nТурнир будет переведен в статус «Отменен». Участники и история турнира сохранятся. Это действие нельзя отменить.",
                    )
                  ) {
                    return;
                  }

                  startTransition(async () => {
                    const result = await cancelTournamentAction({ competitionId });

                    setMessage(result.message ?? null);

                    if (result.ok) {
                      router.refresh();
                    }
                  });
                }}
                className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-default)] border border-rose-300 bg-white px-5 py-2 text-[0.82rem] font-semibold uppercase tracking-[0.02em] text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {destructiveButtonLabel}
              </button>
            ) : null}
          </div>

          {isEditable ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await updateTournamentDraftAction({
                    competitionId,
                    location,
                    maxParticipants: Number.parseInt(maxParticipants, 10),
                    matchFormat,
                    scheduledDate,
                    scheduledTime,
                    title,
                  });

                  setMessage(result.message ?? null);

                  if (result.ok) {
                    router.refresh();
                  }
                })
              }
              className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-default)] bg-blue-600 px-5 py-2 text-[0.82rem] font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isPending ? "Сохраняем..." : "Сохранить изменения"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ResultModal({
  format,
  isPending,
  match,
  onClose,
  onSubmit,
}: {
  format: MatchFormat;
  isPending: boolean;
  match: TournamentBracketMatch;
  onClose: () => void;
  onSubmit: (payload: { score: MatchScore; winnerParticipantId: string }) => void;
}) {
  const [winnerKey, setWinnerKey] = useState<WinnerKey>("player1");
  const [selectedScore, setSelectedScore] = useState<MatchScore | null>(() =>
    getDefaultWinningScore(format, "player1"),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const winnerParticipantId =
    winnerKey === "player1" ? match.slot1.participantId : match.slot2.participantId;
  const availableScores = SCORE_OPTIONS[format].filter((score) =>
    winnerKey === "player1" ? score.player1 > score.player2 : score.player2 > score.player1,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/45 backdrop-blur-[1px] md:items-center md:justify-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full rounded-t-[20px] bg-white px-4 py-4 shadow-[0_-12px_48px_rgba(15,23,42,0.18)] md:max-w-[460px] md:rounded-[8px] md:px-5 md:py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[1.16rem] font-semibold tracking-tight text-slate-950">
              Внести результат
            </p>
            <p className="mt-1 text-[0.88rem] text-slate-500">
              {match.slot1.displayName} · {match.slot2.displayName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Победитель
            </p>
            <div className="grid gap-2">
              {[
                { key: "player1" as const, label: match.slot1.displayName },
                { key: "player2" as const, label: match.slot2.displayName },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setWinnerKey(option.key);
                    setSelectedScore(getDefaultWinningScore(format, option.key));
                    setError(null);
                  }}
                  className={`inline-flex min-h-11 items-center justify-start rounded-[8px] border px-3.5 text-left text-[0.92rem] font-medium transition ${
                    winnerKey === option.key
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Счет
            </p>
            <div className="flex flex-wrap gap-2">
              {availableScores.map((score) => {
                const isSelected =
                  selectedScore?.player1 === score.player1 &&
                  selectedScore?.player2 === score.player2;

                return (
                  <button
                    key={`${score.player1}:${score.player2}`}
                    type="button"
                    onClick={() => {
                      setSelectedScore(score);
                      setError(null);
                    }}
                    className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 text-[0.88rem] font-semibold transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {score.player1}:{score.player2}
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-3.5 py-3 text-[0.88rem] text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-4 text-[0.92rem] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (!winnerParticipantId) {
                  setError("Выберите победителя.");
                  return;
                }

                if (!selectedScore) {
                  setError("Выберите счет.");
                  return;
                }

                onSubmit({
                  score: selectedScore,
                  winnerParticipantId,
                });
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
            >
              {isPending ? "Сохраняем..." : "Сохранить результат"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TournamentDetailView({
  closeHref,
  competition,
  participantOptions,
  participants,
  permissions,
  rounds,
  runtimeState,
  viewerRegistration,
}: TournamentDetailViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TournamentTab>("overview");
  const [isPending, startTransition] = useTransition();
  const [overviewMessage, setOverviewMessage] = useState<string | null>(null);
  const [participantsMessage, setParticipantsMessage] = useState<string | null>(null);
  const [bracketMessage, setBracketMessage] = useState<string | null>(null);
  const [title, setTitle] = useState(competition.title);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    participantOptions[0]?.participantId ?? "",
  );
  const [resultMatch, setResultMatch] = useState<TournamentBracketMatch | null>(null);

  const organizerDisplay = competition.organizerName?.trim() || "Организатор не указан";
  const statusUi = getTournamentStatusChipUi(runtimeState);
  const visibleParticipants = participants;
  const effectiveSelectedParticipantId = participantOptions.some(
    (entry) => entry.participantId === selectedParticipantId,
  )
    ? selectedParticipantId
    : (participantOptions[0]?.participantId ?? "");
  const participantCountLabel = `${participants.length} / ${competition.maxParticipants}`;
  const viewerParticipates = viewerRegistration.isViewerRegistered;
  const completedSummary = getCompletedTournamentSummary(rounds);
  const startDateTimeLabel = formatStateStartDateTime(competition.scheduledAt);

  let stateDescription = "";

  if (runtimeState.status === "draft") {
    stateDescription =
      "Турнир еще не опубликован. Вы можете изменить параметры, добавить участников или открыть регистрацию.";
  } else if (runtimeState.status === "registration") {
    stateDescription = viewerRegistration.isViewerRegistered
      ? "Вы уже в списке участников. При необходимости можно отменить регистрацию."
      : permissions.canManageTournament
        ? "Идет набор участников. После закрытия регистрации состав будет зафиксирован."
        : "Идет набор участников. Вы можете зарегистрироваться, пока регистрация не закрыта.";
  } else if (runtimeState.effectiveStatus === "in_progress") {
    stateDescription = "Турнир уже начался. Следите за сеткой и результатами матчей.";
  } else if (runtimeState.status === "completed") {
    stateDescription = "";
  } else if (runtimeState.status === "cancelled") {
    stateDescription = "Турнир был отменен организатором.";
  } else if (runtimeState.shouldWarnMissingBracketAtStart) {
    stateDescription =
      "Регистрация завершена, но сетка еще не сформирована. Турнир начнется после генерации сетки.";
  } else if (startDateTimeLabel) {
    stateDescription = `Регистрация завершена. Сетка сформирована. Турнир начнется ${startDateTimeLabel}.`;
  } else {
    stateDescription = "Регистрация завершена. Сетка сформирована. Турнир скоро начнется.";
  }

  async function runAction(
    callback: () => Promise<{ message: string; ok: boolean } | { message?: string; ok?: boolean }>,
    setMessage: (value: string | null) => void,
    afterSuccess?: () => void,
  ) {
    startTransition(async () => {
      const result = await callback();

      if ("ok" in result && result.ok) {
        setMessage(result.message ?? null);
        afterSuccess?.();
        router.refresh();
        return;
      }

      setMessage(("message" in result && result.message) || "Не удалось выполнить действие.");
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 md:gap-5">
      <div className="md:hidden">
        <Link
          href={closeHref}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-default)] text-blue-600 transition hover:bg-blue-50"
        >
          <BackArrowIcon />
        </Link>
      </div>

      <header className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {permissions.canEditDraft ? (
              <label className="block">
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Название турнира
                </span>
                <input
                  className="mt-2 min-h-7 w-full border-0 border-b border-slate-200 bg-transparent px-0 pb-1.5 pt-0 text-[1.55rem] font-semibold leading-tight tracking-tight text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-0 md:text-[1.8rem]"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Введите название турнира"
                  required
                  type="text"
                  value={title}
                />
              </label>
            ) : (
              <h1 className="text-[1.55rem] font-semibold tracking-tight text-slate-950 md:text-[1.8rem]">
                {competition.title}
              </h1>
            )}
          </div>
        </div>

        <nav aria-label="Разделы турнира" className="mt-5 flex flex-wrap items-center gap-2">
          <TabButton
            active={activeTab === "overview"}
            label="Обзор"
            onClick={() => setActiveTab("overview")}
          />
          <TabButton
            active={activeTab === "participants"}
            label="Участники"
            onClick={() => setActiveTab("participants")}
          />
          <TabButton
            active={activeTab === "bracket"}
            label="Сетка"
            onClick={() => setActiveTab("bracket")}
          />
        </nav>
      </header>

      {activeTab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <section>
            <DraftOverviewEditor
              key={`${competition.id}:${competition.title}:${competition.matchFormat}:${competition.maxParticipants}:${competition.scheduledAt ?? ""}:${competition.location ?? ""}`}
              canCancelTournament={permissions.canCancelTournament}
              canDeleteTournament={permissions.canDeleteTournament}
              activityName={competition.activityName}
              competitionId={competition.id}
              initialLocation={competition.location}
              initialMatchFormat={competition.matchFormat}
              initialMaxParticipants={competition.maxParticipants}
              initialOrganizerName={organizerDisplay}
              initialScheduledAt={competition.scheduledAt}
              isEditable={permissions.canEditDraft}
              title={title}
            />
          </section>

          <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)] xl:sticky xl:top-4">
            <div className="flex items-center justify-between gap-3">
              <span
                className={`inline-flex min-h-7 items-center rounded-[var(--radius-default)] px-3 text-[0.72rem] font-semibold tracking-[0.08em] ${statusUi.className}`}
              >
                {statusUi.label}
              </span>

              <p className="inline-flex items-center gap-1.5 text-[0.84rem] font-medium text-slate-500">
                <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
                  <path
                    d="M5.333 6.333a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM10.667 7.667a1.667 1.667 0 1 0 0-3.334 1.667 1.667 0 0 0 0 3.334ZM2.667 12.667v-.334c0-1.472 1.194-2.666 2.666-2.666h.667c1.473 0 2.667 1.194 2.667 2.666v.334M9 12.667v-.334c0-1.104.895-2 2-2h.333c1.105 0 2 .896 2 2v.334"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.2"
                  />
                </svg>
                {participantCountLabel}
              </p>
            </div>

            {stateDescription ? (
              <p className="mt-4 text-[0.92rem] leading-6 text-slate-500">
                {stateDescription}
              </p>
            ) : null}

            {runtimeState.shouldWarnMissingBracketAtStart && permissions.canManageTournament ? (
              <div className="mt-4 rounded-[var(--radius-default)] border border-amber-200 bg-amber-50 px-3.5 py-3 text-[0.88rem] text-amber-800">
                Время старта уже наступило, но сетка еще не сгенерирована. Турнир остается в
                статусе готовности, пока организатор или администратор не создаст сетку.
              </div>
            ) : null}

            {viewerParticipates &&
            (runtimeState.status === "ready" || runtimeState.effectiveStatus === "in_progress") ? (
              <div className="mt-4 rounded-[var(--radius-default)] border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[0.88rem] font-semibold text-emerald-700">
                Вы участвуете в турнире.
              </div>
            ) : null}

            {runtimeState.status === "completed" && completedSummary.winnerName ? (
              <div className="mt-4 space-y-2 rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3.5 py-3 text-[0.88rem] text-slate-700">
                <p>
                  Победитель:{" "}
                  <span className="font-semibold text-slate-900">
                    {completedSummary.winnerName}
                  </span>
                </p>
              </div>
            ) : null}

            {overviewMessage ? (
              <div className="mt-4 rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3.5 py-3 text-[0.88rem] text-slate-600">
                {overviewMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              {permissions.canOpenRegistration ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () => openTournamentRegistrationAction({ competitionId: competition.id }),
                      setOverviewMessage,
                    )
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-emerald-500 bg-emerald-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:border-emerald-300 disabled:bg-emerald-300"
                >
                  Открыть регистрацию
                </button>
              ) : null}

              {permissions.canCloseRegistration ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () => closeTournamentRegistrationAction({ competitionId: competition.id }),
                      setOverviewMessage,
                    )
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
                >
                  Закрыть регистрацию
                </button>
              ) : null}

              {permissions.canMoveToReady ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () => moveTournamentToReadyAction({ competitionId: competition.id }),
                      setOverviewMessage,
                    )
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-white px-4 text-[0.92rem] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Перевести в ready
                </button>
              ) : null}

              {viewerRegistration.canSelfRegister ? (
                viewerRegistration.isViewerRegistered ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await unregisterFromTournamentAction({
                          competitionId: competition.id,
                        });

                        if (result.ok) {
                          setOverviewMessage(null);
                          router.refresh();
                          return;
                        }

                        setOverviewMessage(
                          result.message ?? "Не удалось отменить регистрацию.",
                        );
                      })
                    }
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-white px-4 text-[0.92rem] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Отменить регистрацию
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await registerToTournamentAction({
                          competitionId: competition.id,
                        });

                        if (result.ok) {
                          setOverviewMessage(null);
                          router.refresh();
                          return;
                        }

                        setOverviewMessage(
                          result.message ?? "Не удалось зарегистрироваться.",
                        );
                      })
                    }
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-5 text-[0.96rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
                  >
                    Зарегистрироваться
                  </button>
                )
              ) : null}
            </div>
          </section>

        </div>
      ) : null}

      {activeTab === "participants" ? (
        <div className="space-y-4">
          {permissions.canManageParticipantAdd ? (
            <div className="mt-5 rounded-[var(--radius-default)] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <select
                  value={effectiveSelectedParticipantId}
                  onChange={(event) => setSelectedParticipantId(event.target.value)}
                  disabled={participantOptions.length === 0 || isPending}
                  className="min-h-11 flex-1 rounded-[var(--radius-default)] border border-slate-200 bg-white px-3.5 text-[0.92rem] text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {participantOptions.length === 0 ? (
                    <option value="">Все доступные участники уже добавлены</option>
                  ) : (
                    participantOptions.map((option) => (
                      <option key={option.participantId} value={option.participantId}>
                        {option.displayName}
                      </option>
                    ))
                  )}
                </select>

                <button
                  type="button"
                  disabled={!effectiveSelectedParticipantId || participantOptions.length === 0 || isPending}
                  onClick={() =>
                    runAction(
                      () =>
                        addTournamentParticipantAction({
                          competitionId: competition.id,
                          participantId: effectiveSelectedParticipantId,
                        }),
                      setParticipantsMessage,
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
                >
                  Добавить участника
                </button>
              </div>

              {participantsMessage ? (
                <p className="mt-3 text-[0.88rem] text-slate-500">{participantsMessage}</p>
              ) : null}
            </div>
          ) : null}

          {visibleParticipants.length > 0 ? (
            <section className="hidden overflow-hidden rounded-[var(--radius-default)] border border-slate-200/90 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.035)] md:block">
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-collapse">
                  <thead className="border-b border-slate-200/90 bg-slate-100">
                    <tr className="text-left">
                      <th className="w-16 px-3.5 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        №
                      </th>
                      <th className="px-3.5 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        Участник
                      </th>
                      <th className="w-24 px-3.5 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        Рейтинг
                      </th>
                      <th className="w-24 px-3.5 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        WIN RATE
                      </th>
                      {permissions.canManageParticipantRemove ? (
                        <th className="w-28 px-3.5 py-2 text-right text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-slate-600">
                          Действие
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleParticipants.map((participant, index) => (
                      <tr
                        key={participant.competitionParticipantId}
                        className="border-t border-slate-100 bg-white"
                      >
                        <td className="px-3.5 py-2.5 text-[0.8rem] font-semibold text-slate-500">
                          {participant.seed !== null ? String(participant.seed).padStart(2, "0") : String(index + 1).padStart(2, "0")}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="text-[0.84rem] font-semibold text-slate-800">
                            {participant.displayName}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center text-[0.82rem] font-semibold text-blue-600">
                          {participant.rating ?? "—"}
                        </td>
                        <td className="px-3.5 py-2.5 text-center text-[0.8rem] text-slate-600">
                          {getWinRate(participant.wins, participant.matchesPlayed)}
                        </td>
                        {permissions.canManageParticipantRemove ? (
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                runAction(
                                  () =>
                                    removeTournamentParticipantAction({
                                      competitionId: competition.id,
                                      participantId: participant.participantId,
                                    }),
                                  setParticipantsMessage,
                                )
                              }
                              className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-3 text-[0.84rem] font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Удалить
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {visibleParticipants.length > 0 ? (
              <div className="space-y-1.5 md:hidden">
                {visibleParticipants.map((participant, index) => (
                  <article
                    key={participant.competitionParticipantId}
                    className="rounded-[var(--radius-default)] border border-slate-200 bg-slate-50/70 px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 text-[0.82rem] font-semibold text-slate-500">
                          № {participant.seed !== null ? String(participant.seed).padStart(2, "0") : String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="truncate text-[0.96rem] font-semibold text-slate-900">
                          {participant.displayName}
                        </p>
                      </div>

                      {permissions.canManageParticipantRemove ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runAction(
                              () =>
                                removeTournamentParticipantAction({
                                  competitionId: competition.id,
                                  participantId: participant.participantId,
                                }),
                              setParticipantsMessage,
                            )
                          }
                          className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 px-3 text-[0.82rem] font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Удалить
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-[var(--radius-default)] bg-white px-3 py-2">
                        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          Рейтинг
                        </p>
                        <p className="mt-1 text-[0.9rem] font-semibold text-blue-600">
                          {participant.rating ?? "—"}
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-default)] bg-white px-3 py-2">
                        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          WIN RATE
                        </p>
                        <p className="mt-1 text-[0.9rem] font-semibold text-slate-800">
                          {getWinRate(participant.wins, participant.matchesPlayed)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
          ) : (
            <p className="mt-4 text-[0.9rem] text-slate-500">
              Организатор еще не добавил участников.
            </p>
          )}
        </div>
      ) : null}

      {activeTab === "bracket" ? (
        <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-slate-700">
                Сетка
              </h2>
              <p className="mt-2 max-w-[34rem] text-[0.9rem] leading-6 text-slate-500">
                {rounds.length > 0
                  ? "После генерации сетки позиции игроков не меняются."
                  : "Сетка еще не сформирована."}
              </p>
            </div>

            {permissions.canGenerateBracket && rounds.length === 0 ? (
              <button
                type="button"
                disabled={participants.length < 2 || isPending}
                onClick={() =>
                  runAction(
                    () => generateTournamentBracketAction({ competitionId: competition.id }),
                    setBracketMessage,
                  )
                }
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
              >
                Сгенерировать сетку
              </button>
            ) : null}
          </div>

          {bracketMessage ? (
            <div className="mt-4 rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3.5 py-3 text-[0.88rem] text-slate-600">
              {bracketMessage}
            </div>
          ) : null}

          {rounds.length === 0 ? (
            <div className="mt-5 rounded-[var(--radius-default)] border border-slate-200 bg-slate-50/70 px-4 py-5">
              <p className="text-[0.92rem] text-slate-500">
                {participants.length < 2
                  ? "Для генерации сетки нужно добавить минимум двух участников."
                  : "Сетка будет доступна после генерации."}
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <TournamentBracketView
                isPending={isPending}
                onOpenResult={(matchId) => {
                  const nextMatch = rounds
                    .flatMap((round) => round.matches)
                    .find((entry) => entry.id === matchId);

                  if (!nextMatch) {
                    return;
                  }

                  setBracketMessage(null);
                  setResultMatch(nextMatch);
                }}
                rounds={rounds}
              />
            </div>
          )}
        </section>
      ) : null}

      {resultMatch ? (
        <ResultModal
          format={competition.matchFormat}
          isPending={isPending}
          match={resultMatch}
          onClose={() => setResultMatch(null)}
          onSubmit={(payload) =>
            runAction(
              () =>
                saveTournamentMatchResultAction({
                  competitionId: competition.id,
                  competitionMatchId: resultMatch.id,
                  score: payload.score,
                  winnerParticipantId: payload.winnerParticipantId,
                }),
              setBracketMessage,
              () => setResultMatch(null),
            )
          }
        />
      ) : null}
    </div>
  );
}
