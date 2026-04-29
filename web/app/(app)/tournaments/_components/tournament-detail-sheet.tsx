"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { AuthenticatedViewer } from "@/src/auth/current-viewer";
import {
  addTournamentParticipantAction,
  cancelTournamentAction,
  deleteTournamentDraftAction,
  generateTournamentBracketAction,
  removeTournamentParticipantAction,
  saveTournamentMatchResultAction,
  updateTournamentDraftAction,
} from "../actions";

type MatchFormat = "BO1" | "BO3" | "BO5";
type TournamentStatus = "draft" | "in_progress" | "completed" | "cancelled";

type ParticipantItem = {
  competitionParticipantId: string;
  displayName: string;
  participantId: string;
  rating: number | null;
  seed: number | null;
};

type BracketMatchItem = {
  id: string;
  matchNumber: number;
  resolutionType: "bye" | "played" | null;
  roundNumber: number;
  slot1ParticipantId: string | null;
  slot1Seed: number | null;
  slot2Seed: number | null;
  slot2ParticipantId: string | null;
  slot1Score: number | null;
  slot2Score: number | null;
  slot1DisplayName: string | null;
  slot2DisplayName: string | null;
  status: "completed" | "pending";
  winnerParticipantId: string | null;
  winnerDisplayName: string | null;
};

type BracketRoundItem = {
  matches: BracketMatchItem[];
  roundNumber: number;
};

type ParticipantOption = {
  id: string;
  name: string;
};

type TournamentDetailSheetProps = {
  bracket: BracketRoundItem[];
  canManageDraft: boolean;
  closeHref: string;
  competition: {
    activityName: string;
    createdByProfileId: string;
    id: string;
    location: string | null;
    matchFormat: MatchFormat;
    organizerName: string | null;
    scheduledAt: string | null;
    status: TournamentStatus;
    title: string;
  };
  participantOptions: ParticipantOption[];
  participants: ParticipantItem[];
  presentation: "modal" | "page";
  viewer: AuthenticatedViewer;
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

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M4.5 4.5 13.5 13.5M13.5 4.5 4.5 13.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="M3.5 4h9M6.5 2.75h3M6 6.25v4.5M10 6.25v4.5M4.75 4l.4 6.1c.05.78.7 1.4 1.48 1.4h2.74c.78 0 1.43-.62 1.48-1.4l.4-6.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.25 13.25 17 17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function getStatusUi(status: TournamentStatus) {
  switch (status) {
    case "draft":
      return {
        className: "border border-slate-300 bg-slate-100 text-slate-600",
        label: "ЧЕРНОВИК",
      };
    case "in_progress":
      return {
        className: "bg-blue-50 text-blue-700",
        label: "ИДЕТ",
      };
    case "completed":
      return {
        className: "bg-slate-200 text-slate-700",
        label: "ЗАВЕРШЕН",
      };
    case "cancelled":
      return {
        className: "border border-red-200 bg-red-50 text-red-700",
        label: "ОТМЕНЕН",
      };
  }
}

function formatParticipantsLabel(count: number) {
  const normalized = Math.abs(count) % 100;
  const lastDigit = normalized % 10;

  if (normalized >= 11 && normalized <= 19) {
    return `${count} игроков`;
  }

  if (lastDigit === 1) {
    return `${count} игрок`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} игрока`;
  }

  return `${count} игроков`;
}

function parseScheduledAt(value: string | null) {
  if (!value) {
    return null;
  }

  const scheduledAt = new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  return scheduledAt;
}

function formatScheduledDate(value: string | null) {
  const scheduledAt = parseScheduledAt(value);

  if (!scheduledAt) {
    return "Не указана";
  }

  const day = String(scheduledAt.getDate()).padStart(2, "0");
  const month = String(scheduledAt.getMonth() + 1).padStart(2, "0");
  const year = String(scheduledAt.getFullYear());

  return `${day}.${month}.${year}`;
}

function getScheduledDateInputValue(value: string | null) {
  const scheduledAt = parseScheduledAt(value);

  if (!scheduledAt) {
    return "";
  }

  const day = String(scheduledAt.getDate()).padStart(2, "0");
  const month = String(scheduledAt.getMonth() + 1).padStart(2, "0");
  const year = String(scheduledAt.getFullYear());

  return `${year}-${month}-${day}`;
}

function formatScheduledTime(value: string | null) {
  const scheduledAt = parseScheduledAt(value);

  if (!scheduledAt) {
    return "Не указано";
  }

  const hours = String(scheduledAt.getHours()).padStart(2, "0");
  const minutes = String(scheduledAt.getMinutes()).padStart(2, "0");

  if (hours === "00" && minutes === "00") {
    return "Не указано";
  }

  return `${hours}:${minutes}`;
}

function getScheduledTimeInputValue(value: string | null) {
  const formattedTime = formatScheduledTime(value);
  return formattedTime === "Не указано" ? "" : formattedTime;
}

function getRoundLabel(roundNumber: number, totalRounds: number) {
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

type MatchScore = {
  player1: number;
  player2: number;
};

type MatchWinnerKey = "player1" | "player2";

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

function getScoreText(score: MatchScore) {
  return `${score.player1}:${score.player2}`;
}

function getScoreWinner(score: MatchScore): MatchWinnerKey {
  return score.player1 > score.player2 ? "player1" : "player2";
}

type TournamentInfoBlockProps = {
  canManageDraft: boolean;
  dateValue: string;
  locationValue: string;
  locationDisplay: string;
  matchFormat: MatchFormat;
  organizerDisplay: string;
  onDateChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onMatchFormatChange: (value: MatchFormat) => void;
  onTimeChange: (value: string) => void;
  timeValue: string;
  timeDisplay: string;
};

function TournamentInfoBlock({
  canManageDraft,
  dateValue,
  locationValue,
  locationDisplay,
  matchFormat,
  organizerDisplay,
  onDateChange,
  onLocationChange,
  onMatchFormatChange,
  onTimeChange,
  timeValue,
  timeDisplay,
}: TournamentInfoBlockProps) {
  const metadata = [
    {
      label: "Активность",
      value: (
        <p className="text-[0.94rem] font-medium text-slate-800 md:text-[0.88rem]">
          Настольный теннис
        </p>
      ),
    },
    {
      label: "Формат турнира",
      value: (
        <p className="text-[0.94rem] font-medium text-slate-800 md:text-[0.88rem]">
          На выбывание
        </p>
      ),
    },
    {
      label: "Формат матча",
      value: canManageDraft ? (
        <div className="grid grid-cols-3 gap-2 md:max-w-[15rem] md:gap-1.5">
          {(["BO1", "BO3", "BO5"] as MatchFormat[]).map((option) => {
            const isActive = matchFormat === option;

            return (
              <button
                key={option}
                className={`inline-flex min-h-10 items-center justify-center rounded-[var(--radius-default)] border text-[0.9rem] font-semibold transition md:min-h-[2.125rem] md:text-[0.82rem] ${
                  isActive
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => onMatchFormatChange(option)}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[0.94rem] font-medium text-slate-800 md:text-[0.88rem]">
          {matchFormat}
        </p>
      ),
    },
    {
      label: "Дата и время",
      value: canManageDraft ? (
        <div className="grid gap-2 md:grid-cols-2 md:gap-2">
          <input
            className="min-h-10 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white px-3 text-[0.96rem] font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:min-h-[2.125rem] md:px-2.5 md:text-[0.9rem]"
            onChange={(event) => onDateChange(event.target.value)}
            type="date"
            value={dateValue}
          />
          <input
            className="min-h-10 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white px-3 text-[0.96rem] font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:min-h-[2.125rem] md:px-2.5 md:text-[0.9rem]"
            onChange={(event) => onTimeChange(event.target.value)}
            step={60}
            type="time"
            value={timeValue}
          />
        </div>
      ) : (
        <p className="text-[0.94rem] font-medium text-slate-800 md:text-[0.88rem]">
          {formatScheduledDate(dateValue || null)}
          {timeDisplay !== "Не указано" ? ` · ${timeDisplay}` : ""}
        </p>
      ),
    },
    {
      label: "Локация",
      value: canManageDraft ? (
        <input
          className="min-h-10 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white px-3 text-[0.96rem] font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:min-h-[2.125rem] md:px-2.5 md:text-[0.9rem]"
          onChange={(event) => onLocationChange(event.target.value)}
          placeholder="Укажите место проведения"
          type="text"
          value={locationValue}
        />
      ) : (
        <p className="text-[0.94rem] font-medium text-slate-800 md:text-[0.88rem]">
          {locationDisplay}
        </p>
      ),
    },
    {
      label: "Организатор",
      value: (
        <p className="text-[0.94rem] font-medium text-slate-800 md:text-[0.88rem]">
          {organizerDisplay}
        </p>
      ),
    },
  ];

  return (
    <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] md:px-4 md:py-3.5">
      <div className="space-y-3 md:space-y-2.5">
        {metadata.map((item) => (
          <div
            key={item.label}
            className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0 md:grid md:grid-cols-[10rem_minmax(0,1fr)] md:items-start md:gap-4 md:pt-2.5"
          >
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-slate-500 md:pt-2">
              {item.label}
            </p>
            <div className="mt-1.5 md:mt-0">{item.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

type BracketViewProps = {
  bracket: BracketRoundItem[];
  canReportResults: boolean;
  canOpenWinnerCelebration: boolean;
  onOpenWinnerCelebration: (match: BracketMatchItem) => void;
  onReportResult: (match: BracketMatchItem) => void;
};

function BracketView({
  bracket,
  canOpenWinnerCelebration,
  onOpenWinnerCelebration,
  canReportResults,
  onReportResult,
}: BracketViewProps) {
  const totalRounds = bracket.length;

  return (
    <div className="space-y-3.5 md:space-y-3">
      {bracket.map((round) => (
        <section key={round.roundNumber} className="space-y-2.5 md:space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[0.92rem] font-semibold tracking-tight text-slate-900 md:text-[0.84rem]">
              {getRoundLabel(round.roundNumber, totalRounds)}
            </h3>
            <span className="inline-flex min-h-6 items-center rounded-full border border-slate-200 bg-white px-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {round.matches.length} матч.
            </span>
          </div>

          <div className="border-t border-slate-200/70" />

          <div className="space-y-2 md:space-y-1.5">
            {round.matches.map((match) => {
              const isCompleted = match.status === "completed";
              const isBye = match.resolutionType === "bye";
              const isFinal = round.roundNumber === totalRounds;
              const hasBothParticipants = Boolean(
                match.slot1ParticipantId && match.slot2ParticipantId,
              );
              const hasResolvedPlayers =
                !isBye &&
                isCompleted &&
                Boolean(
                  match.slot1ParticipantId &&
                    match.slot2ParticipantId &&
                    match.slot1DisplayName &&
                    match.slot2DisplayName &&
                    match.winnerParticipantId,
                );
              const canEnterResult =
                canReportResults && !isCompleted && !isBye && hasBothParticipants;
              const canOpenCelebration =
                canOpenWinnerCelebration &&
                isFinal &&
                isCompleted &&
                !isBye &&
                Boolean(match.winnerParticipantId && match.winnerDisplayName);
              const hasScore =
                match.slot1Score !== null && match.slot2Score !== null;
              const scoreText = hasScore
                ? match.winnerParticipantId === match.slot2ParticipantId
                  ? `${match.slot2Score}:${match.slot1Score}`
                  : `${match.slot1Score}:${match.slot2Score}`
                : isBye
                  ? "BYE"
                  : "—";
              const cardClassName = isBye
                ? "border-blue-200/80 bg-gradient-to-br from-blue-50 via-indigo-50/60 to-white shadow-[0_8px_18px_rgba(37,99,235,0.06)]"
                : isFinal
                  ? "border-amber-300/90 bg-gradient-to-br from-amber-50 via-yellow-50/60 to-white shadow-[0_8px_18px_rgba(217,119,6,0.08)]"
                  : "border-slate-200 bg-white shadow-[0_8px_16px_rgba(15,23,42,0.05)]";
              const participantRows = hasResolvedPlayers
                ? [
                    {
                      displayName:
                        match.winnerParticipantId === match.slot1ParticipantId
                          ? match.slot1DisplayName
                          : match.slot2DisplayName,
                      isWinner: true,
                      score:
                        match.winnerParticipantId === match.slot1ParticipantId
                          ? match.slot1Score
                          : match.slot2Score,
                      seed:
                        match.winnerParticipantId === match.slot1ParticipantId
                          ? match.slot1Seed
                          : match.slot2Seed,
                    },
                    {
                      displayName:
                        match.winnerParticipantId === match.slot1ParticipantId
                          ? match.slot2DisplayName
                          : match.slot1DisplayName,
                      isWinner: false,
                      score:
                        match.winnerParticipantId === match.slot1ParticipantId
                          ? match.slot2Score
                          : match.slot1Score,
                      seed:
                        match.winnerParticipantId === match.slot1ParticipantId
                          ? match.slot2Seed
                          : match.slot1Seed,
                    },
                  ]
                : null;

              return (
                <article
                  key={match.id}
                  className={`rounded-[var(--radius-default)] border px-3 py-2.5 transition md:px-2.5 md:py-2 ${cardClassName} ${
                    canOpenCelebration ? "cursor-pointer hover:scale-[1.01]" : ""
                  }`}
                  onClick={canOpenCelebration ? () => onOpenWinnerCelebration(match) : undefined}
                  role={canOpenCelebration ? "button" : undefined}
                  tabIndex={canOpenCelebration ? 0 : undefined}
                  onKeyDown={
                    canOpenCelebration
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onOpenWinnerCelebration(match);
                          }
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[0.7rem] font-semibold uppercase tracking-[0.08em] ${
                          isBye
                            ? "text-blue-700"
                            : isCompleted
                              ? "text-slate-900"
                              : "text-slate-600"
                        }`}
                      >
                        {isBye ? "Автопроход" : isCompleted ? "Сыгран" : "Ожидается"}
                      </span>
                    </div>
                    {isCompleted && !isBye ? (
                      <span
                        className={`inline-flex min-h-6 items-center rounded-[var(--radius-default)] border px-2.5 text-[0.76rem] font-semibold ${
                          isFinal
                            ? "border-amber-200 bg-amber-50/85 text-slate-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {scoreText}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex min-h-6 items-center rounded-[var(--radius-default)] border px-2.5 text-[0.76rem] font-semibold ${
                          isBye
                            ? "border-blue-200 bg-white/85 text-blue-700"
                            : isFinal
                              ? "border-amber-200 bg-amber-50/85 text-slate-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {scoreText}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1.5 text-[0.9rem] md:mt-1.5 md:text-[0.82rem]">
                    {participantRows ? (
                      participantRows.map((row) => (
                        <div
                          key={`${match.id}-${row.displayName}-${row.isWinner ? "winner" : "loser"}`}
                          className="rounded-[var(--radius-default)] px-1 py-0.5"
                        >
                          <p
                            className={`truncate font-medium ${
                              row.isWinner ? "font-semibold text-slate-950" : "text-slate-700"
                            }`}
                          >
                            {row.seed ? (
                              <span className="mr-1 text-[0.8em] font-semibold text-blue-600">
                                #{row.seed}
                              </span>
                            ) : null}
                            {row.displayName}
                          </p>
                        </div>
                      ))
                    ) : (
                      <>
                        <p
                          className={`font-medium ${
                            match.winnerDisplayName === match.slot1DisplayName
                              ? "text-slate-900"
                              : "text-slate-800"
                          }`}
                        >
                          {match.slot1DisplayName ? (
                            <>
                              {match.slot1Seed ? (
                                <span className="mr-1 text-[0.8em] font-semibold text-blue-700">
                                  #{match.slot1Seed}
                                </span>
                              ) : null}
                              {match.slot1DisplayName}
                            </>
                          ) : (
                            "Ожидает победителя..."
                          )}
                        </p>
                        <p
                          className={`font-medium ${
                            match.winnerDisplayName === match.slot2DisplayName
                              ? "text-slate-900"
                              : "text-slate-800"
                          }`}
                        >
                          {match.slot2DisplayName ? (
                            <>
                              {match.slot2Seed ? (
                                <span className="mr-1 text-[0.8em] font-semibold text-blue-700">
                                  #{match.slot2Seed}
                                </span>
                              ) : null}
                              {match.slot2DisplayName}
                            </>
                          ) : isBye ? (
                            <span className="text-slate-600">Свободный слот (BYE)</span>
                          ) : (
                            "Ожидает победителя..."
                          )}
                        </p>
                      </>
                    )}
                  </div>

                  {isBye ? (
                    <p className="mt-1.5 text-[0.72rem] text-slate-600 md:text-[0.68rem]">
                      Участник автоматически проходит в следующий раунд
                    </p>
                  ) : canEnterResult ? (
                    <button
                      className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-3 text-[0.84rem] font-semibold text-white transition hover:bg-blue-600 md:min-h-8 md:text-[0.78rem]"
                      onClick={() => onReportResult(match)}
                      type="button"
                    >
                      Внести результат
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

type WinnerCelebrationData = {
  finalScore: string | null;
  matchId: string;
  winnerName: string;
  winnerSeed: number | null;
};

function getWinnerOrderedScoreText(match: {
  slot1ParticipantId: string | null;
  slot2ParticipantId: string | null;
  slot1Score: number | null;
  slot2Score: number | null;
  winnerParticipantId: string | null;
}) {
  if (match.slot1Score === null || match.slot2Score === null) {
    return null;
  }

  return match.winnerParticipantId === match.slot2ParticipantId
    ? `${match.slot2Score}:${match.slot1Score}`
    : `${match.slot1Score}:${match.slot2Score}`;
}

function createWinnerCelebrationData(
  match: BracketMatchItem,
  override?: {
    score?: MatchScore;
    winnerName?: string;
    winnerParticipantId?: string;
    winnerSeed?: number | null;
  },
): WinnerCelebrationData | null {
  const winnerParticipantId = override?.winnerParticipantId ?? match.winnerParticipantId;

  if (!winnerParticipantId) {
    return null;
  }

  const winnerName =
    override?.winnerName ??
    (winnerParticipantId === match.slot1ParticipantId
      ? match.slot1DisplayName
      : match.slot2DisplayName);

  if (!winnerName) {
    return null;
  }

  const winnerSeed =
    override?.winnerSeed ??
    (winnerParticipantId === match.slot1ParticipantId ? match.slot1Seed : match.slot2Seed);
  const finalScore = override?.score
    ? winnerParticipantId === match.slot2ParticipantId
      ? `${override.score.player2}:${override.score.player1}`
      : `${override.score.player1}:${override.score.player2}`
    : getWinnerOrderedScoreText(match);

  return {
    finalScore,
    matchId: match.id,
    winnerName,
    winnerSeed,
  };
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function handleChange() {
      setPrefersReducedMotion(mediaQuery.matches);
    }

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

type WinnerCelebrationOverlayProps = {
  data: WinnerCelebrationData | null;
  isOpen: boolean;
  onClose: () => void;
};

function WinnerCelebrationOverlay({
  data,
  isOpen,
  onClose,
}: WinnerCelebrationOverlayProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) {
    return null;
  }

  const confettiPieces = [
    { top: "18%", left: "10%", rotate: "-18deg", delay: "0ms" },
    { top: "30%", left: "4%", rotate: "16deg", delay: "120ms" },
    { top: "68%", left: "12%", rotate: "-10deg", delay: "240ms" },
    { top: "20%", left: "86%", rotate: "20deg", delay: "80ms" },
    { top: "42%", left: "92%", rotate: "-16deg", delay: "200ms" },
    { top: "72%", left: "84%", rotate: "12deg", delay: "320ms" },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/24 px-4 py-6 md:flex md:items-center md:justify-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section className="relative mx-auto mt-20 w-full max-w-[26rem] overflow-hidden rounded-[var(--radius-default)] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.96)_0%,rgba(255,255,255,1)_55%)] p-5 shadow-[0_20px_50px_rgba(180,83,9,0.12)] md:mt-0">
        {confettiPieces.map((piece, index) => (
          <span
            key={`${piece.left}-${piece.top}-${index}`}
            className={`pointer-events-none absolute h-3 w-2 rounded-full bg-amber-300/90 ${
              prefersReducedMotion ? "opacity-60" : "animate-bounce"
            }`}
            style={{
              animationDelay: piece.delay,
              animationDuration: "1.8s",
              left: piece.left,
              opacity: prefersReducedMotion ? 0.45 : 0.8,
              top: piece.top,
              transform: `rotate(${piece.rotate})`,
            }}
          />
        ))}

        <div className="relative text-center">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-amber-700">
            Победитель турнира
          </p>
          <h3 className="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight text-slate-950 md:text-[2.2rem]">
            {data.winnerName}
          </h3>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {data.winnerSeed ? (
              <span className="inline-flex min-h-7 items-center rounded-full border border-blue-200 bg-white/85 px-3 text-[0.78rem] font-semibold text-blue-700">
                Seed #{data.winnerSeed}
              </span>
            ) : null}
            {data.finalScore ? (
              <span className="inline-flex min-h-7 items-center rounded-full border border-amber-200 bg-amber-50/85 px-3 text-[0.78rem] font-semibold text-slate-700">
                Финал: {data.finalScore}
              </span>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

type TournamentMatchResultSheetProps = {
  isOpen: boolean;
  match: BracketMatchItem | null;
  matchFormat: MatchFormat;
  onClose: () => void;
  onSubmit: (payload: {
    competitionMatchId: string;
    score: MatchScore;
    winnerParticipantId: string;
  }) => Promise<{ ok: boolean; message?: string }>;
};

function TournamentMatchResultSheet({
  isOpen,
  match,
  matchFormat,
  onClose,
  onSubmit,
}: TournamentMatchResultSheetProps) {
  const [selectedWinner, setSelectedWinner] = useState<MatchWinnerKey | null>(null);
  const [selectedScore, setSelectedScore] = useState<MatchScore | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interactionHint, setInteractionHint] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const availableScores = useMemo(() => {
    return SCORE_OPTIONS[matchFormat].filter((score) => {
      if (!selectedWinner) {
        return true;
      }

      return getScoreWinner(score) === selectedWinner;
    });
  }, [matchFormat, selectedWinner]);

  if (!isOpen || !match || !match.slot1ParticipantId || !match.slot2ParticipantId) {
    return null;
  }

  const currentMatch = match;
  const slot1ParticipantId = currentMatch.slot1ParticipantId!;
  const slot2ParticipantId = currentMatch.slot2ParticipantId!;

  const winnerOptions = [
    {
      key: "player1" as const,
      label: currentMatch.slot1DisplayName ?? "Участник 1",
      participantId: slot1ParticipantId,
      seed: currentMatch.slot1Seed,
    },
    {
      key: "player2" as const,
      label: currentMatch.slot2DisplayName ?? "Участник 2",
      participantId: slot2ParticipantId,
      seed: currentMatch.slot2Seed,
    },
  ];
  const isFormValid = selectedWinner !== null && selectedScore !== null;

  async function handleSubmit() {
    if (!isFormValid || isSubmitting || !selectedWinner || !selectedScore) {
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedWinnerOption = winnerOptions.find((option) => option.key === selectedWinner);

      if (!selectedWinnerOption) {
        setInteractionHint("Не удалось определить победителя матча.");
        return;
      }

      const result = await onSubmit({
        competitionMatchId: currentMatch.id,
        score: selectedScore,
        winnerParticipantId: selectedWinnerOption.participantId,
      });

      if (!result.ok) {
        setInteractionHint(result.message ?? "Не удалось сохранить результат матча.");
        return;
      }

      onClose();
    } catch {
      setInteractionHint("Не удалось сохранить результат матча. Попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-white md:flex md:items-center md:justify-center md:bg-slate-950/38 md:p-4"
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          window.matchMedia("(min-width: 768px)").matches
        ) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section className="flex h-full w-full flex-col bg-white md:h-auto md:max-h-[min(92vh,760px)] md:max-w-[32.5rem] md:overflow-hidden md:rounded-[var(--radius-default)] md:border md:border-slate-200/90 md:shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-4 md:px-5 md:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-default)] text-blue-600 transition hover:bg-blue-50 md:hidden"
              onClick={onClose}
              type="button"
            >
              <BackArrowIcon />
            </button>
            <h2 className="text-[1.95rem] font-semibold tracking-tight text-slate-950 md:text-[1.55rem]">
              Результат матча
            </h2>
          </div>

          <button
            className="hidden h-9 w-9 items-center justify-center rounded-[var(--radius-default)] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:inline-flex"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          <div className="space-y-5">
            <section className="space-y-3 rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Матч {currentMatch.matchNumber}
                </p>
                <span className="inline-flex min-h-7 items-center rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3 text-[0.72rem] font-semibold text-slate-700">
                  {matchFormat}
                </span>
              </div>

              <div className="space-y-2">
                {winnerOptions.map((option) => {
                  const isActive = selectedWinner === option.key;

                  return (
                    <button
                      key={option.key}
                      className={`flex min-h-12 w-full items-center justify-between rounded-[var(--radius-default)] border px-3 text-left transition ${
                        isActive
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setSelectedWinner(option.key);
                        setSelectedScore(null);
                        setInteractionHint(null);
                      }}
                      type="button"
                    >
                      <span className="truncate text-[0.95rem] font-medium">
                        {option.seed ? `#${option.seed} ` : ""}
                        {option.label}
                      </span>
                      <span className="text-[0.82rem] font-semibold">Победитель</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3 rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Итоговый счет
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availableScores.map((scoreOption) => {
                  const isActive =
                    selectedScore?.player1 === scoreOption.player1 &&
                    selectedScore?.player2 === scoreOption.player2;

                  return (
                    <button
                      key={getScoreText(scoreOption)}
                      className={`inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default)] border text-[0.94rem] font-semibold transition ${
                        isActive
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setSelectedScore(scoreOption);
                        setInteractionHint(null);
                      }}
                      type="button"
                    >
                      {getScoreText(scoreOption)}
                    </button>
                  );
                })}
              </div>
            </section>

            {interactionHint ? (
              <p className="rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3 py-2 text-[0.84rem] text-slate-600">
                {interactionHint}
              </p>
            ) : null}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-slate-200/80 bg-white px-4 py-4 md:px-5 md:py-4">
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
            disabled={!isFormValid || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            Сохранить результат
          </button>
        </div>
      </section>
    </div>
  );
}

type TournamentTitleBlockProps = {
  canManageDraft: boolean;
  organizerDisplay: string;
  statusClassName: string;
  statusLabel: string;
  titleValue: string;
  onTitleChange: (value: string) => void;
};

function TournamentTitleBlock({
  canManageDraft,
  organizerDisplay,
  statusClassName,
  statusLabel,
  titleValue,
  onTitleChange,
}: TournamentTitleBlockProps) {
  return (
    <section className="space-y-3 md:space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {canManageDraft ? (
            <input
              className="min-h-11 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white px-3 text-[1.2rem] font-semibold tracking-tight text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:min-h-[2.625rem] md:px-3 md:text-[1.1rem]"
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Например, Весенний кубок"
              type="text"
              value={titleValue}
            />
          ) : (
            <h2 className="text-[1.55rem] font-semibold leading-8 tracking-tight text-slate-950 md:line-clamp-2 md:max-w-[28rem] md:text-[1.4rem] md:leading-7">
              {titleValue}
            </h2>
          )}
          <p className="mt-1 text-[0.88rem] text-slate-500 md:text-[0.82rem]">
            Организатор: {organizerDisplay}
          </p>
        </div>
        <span
          className={`inline-flex min-h-7 items-center rounded-[var(--radius-default)] px-3 text-[0.7rem] font-semibold tracking-[0.08em] ${statusClassName}`}
        >
          {statusLabel}
        </span>
      </div>
    </section>
  );
}

export function TournamentDetailSheet({
  bracket,
  canManageDraft,
  closeHref,
  competition,
  participantOptions,
  participants,
  presentation,
  viewer,
}: TournamentDetailSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [titleValue, setTitleValue] = useState(competition.title);
  const [dateValue, setDateValue] = useState(getScheduledDateInputValue(competition.scheduledAt));
  const [timeValue, setTimeValue] = useState(getScheduledTimeInputValue(competition.scheduledAt));
  const [locationValue, setLocationValue] = useState(competition.location ?? "");
  const [matchFormat, setMatchFormat] = useState<MatchFormat>(competition.matchFormat);
  const [selectedParticipantId, setSelectedParticipantId] = useState(
    participantOptions[0]?.id ?? "",
  );
  const [participantQuery, setParticipantQuery] = useState("");
  const [isParticipantListOpen, setIsParticipantListOpen] = useState(false);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resultMatch, setResultMatch] = useState<BracketMatchItem | null>(null);
  const [winnerCelebration, setWinnerCelebration] = useState<WinnerCelebrationData | null>(null);
  const statusUi = getStatusUi(competition.status);
  const participantFieldRef = useRef<HTMLDivElement | null>(null);
  const celebrationStorageKey = `sidequest:tournament-winner:${competition.id}`;

  const locationDisplay =
    competition.location && competition.location.trim().length > 0
      ? competition.location
      : "Не указана";
  const organizerDisplay = competition.organizerName?.trim() || "Организатор не указан";
  const timeDisplay = formatScheduledTime(competition.scheduledAt);
  const canGenerateBracket = canManageDraft && participants.length >= 2 && bracket.length === 0;
  const isModal = presentation === "modal";
  const canCancelTournament =
    !canManageDraft &&
    competition.status === "in_progress" &&
    (viewer.role === "admin" ||
      (viewer.role === "organizer" && competition.createdByProfileId === viewer.profileId));
  const canReportResults =
    competition.status === "in_progress" &&
    (viewer.role === "admin" ||
      (viewer.role === "organizer" && competition.createdByProfileId === viewer.profileId));
  const shouldCollapseParticipants = !canManageDraft && participants.length > 2;
  const visibleParticipants = shouldCollapseParticipants && !isParticipantsExpanded
    ? participants.slice(0, 2)
    : participants;

  const participantsCountLabel = useMemo(
    () => formatParticipantsLabel(participants.length),
    [participants.length],
  );
  const effectiveSelectedParticipantId = useMemo(() => {
    if (!canManageDraft || participantOptions.length === 0) {
      return "";
    }

    const hasSelectedOption = participantOptions.some(
      (option) => option.id === selectedParticipantId,
    );

    return hasSelectedOption ? selectedParticipantId : participantOptions[0].id;
  }, [canManageDraft, participantOptions, selectedParticipantId]);
  const selectedParticipantOption = useMemo(
    () =>
      participantOptions.find((option) => option.id === effectiveSelectedParticipantId) ?? null,
    [effectiveSelectedParticipantId, participantOptions],
  );
  const filteredParticipantOptions = useMemo(() => {
    const normalizedQuery = participantQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return participantOptions;
    }

    return participantOptions.filter((option) =>
      option.name.toLowerCase().includes(normalizedQuery),
    );
  }, [participantOptions, participantQuery]);
  const participantInputValue = isParticipantListOpen
    ? participantQuery
    : selectedParticipantOption?.name ?? participantQuery;

  useEffect(() => {
    if (!isModal) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(closeHref, { scroll: false });
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeHref, isModal, router]);

  useEffect(() => {
    if (!canManageDraft || !isParticipantListOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!participantFieldRef.current?.contains(event.target as Node)) {
        setIsParticipantListOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [canManageDraft, isParticipantListOpen]);

  useEffect(() => {
    if (competition.status !== "completed" || winnerCelebration !== null) {
      return;
    }

    const serialized = window.sessionStorage.getItem(celebrationStorageKey);

    if (!serialized) {
      return;
    }

    let frameId: number | null = null;

    try {
      const parsedData = JSON.parse(serialized) as WinnerCelebrationData;
      window.sessionStorage.removeItem(celebrationStorageKey);
      frameId = window.requestAnimationFrame(() => {
        setWinnerCelebration(parsedData);
      });
    } catch {
      window.sessionStorage.removeItem(celebrationStorageKey);
      return;
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [celebrationStorageKey, competition.status, winnerCelebration]);

  function handleRefresh() {
    router.refresh();
  }

  function handleOpenWinnerCelebration(match: BracketMatchItem) {
    const celebrationData = createWinnerCelebrationData(match);

    if (!celebrationData) {
      return;
    }

    setWinnerCelebration(celebrationData);
  }

  function runMutation(task: () => Promise<{ ok: boolean; message?: string }>, onSuccess?: () => void) {
    setFeedbackMessage(null);
    startTransition(async () => {
      try {
        const result = await task();

        if (!result.ok) {
          setFeedbackMessage(result.message ?? "Не удалось выполнить действие.");
          return;
        }

        onSuccess?.();
        handleRefresh();
      } catch {
        setFeedbackMessage("Не удалось выполнить действие. Попробуйте еще раз.");
      }
    });
  }

  return (
    <>
      <div
        className={
          isModal
            ? "fixed inset-0 z-50 bg-white md:flex md:items-center md:justify-center md:bg-slate-950/38 md:p-4"
            : "min-h-screen"
        }
        onClick={(event) => {
          if (
            isModal &&
            event.target === event.currentTarget &&
            window.matchMedia("(min-width: 768px)").matches
          ) {
            router.push(closeHref, { scroll: false });
          }
        }}
        role={isModal ? "presentation" : undefined}
      >
        <section className="flex min-h-screen w-full flex-col bg-white md:min-h-0 md:max-h-[min(88vh,760px)] md:max-w-[40rem] md:overflow-hidden md:rounded-[var(--radius-default)] md:border md:border-slate-200/90 md:shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-4 md:px-[1.125rem] md:py-[0.875rem]">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={closeHref}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-default)] text-blue-600 transition hover:bg-blue-50 md:hidden"
              >
                <BackArrowIcon />
              </Link>

              <h1 className="text-[1.95rem] font-semibold tracking-tight text-slate-950 md:text-[1.55rem]">
                Турнир
              </h1>
            </div>

            <Link
              href={closeHref}
              className="hidden h-9 w-9 items-center justify-center rounded-[var(--radius-default)] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:inline-flex"
            >
              <CloseIcon />
            </Link>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-[1.125rem] md:py-4">
            <div className="space-y-5 md:space-y-3.5">
              <section className="space-y-3 md:space-y-2.5">
                <TournamentTitleBlock
                  canManageDraft={canManageDraft}
                  onTitleChange={setTitleValue}
                  organizerDisplay={organizerDisplay}
                  statusClassName={statusUi.className}
                  statusLabel={statusUi.label}
                  titleValue={titleValue}
                />
                <TournamentInfoBlock
                  canManageDraft={canManageDraft}
                  dateValue={dateValue}
                  locationDisplay={locationDisplay}
                  locationValue={locationValue}
                  matchFormat={matchFormat}
                  organizerDisplay={organizerDisplay}
                  onDateChange={setDateValue}
                  onLocationChange={setLocationValue}
                  onMatchFormatChange={setMatchFormat}
                  onTimeChange={setTimeValue}
                  timeDisplay={timeDisplay}
                  timeValue={timeValue}
                />

                {canManageDraft ? (
                  <button
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300 md:min-h-[2.375rem] md:px-[0.875rem] md:text-[0.86rem]"
                    disabled={isPending}
                    onClick={() =>
                      runMutation(() =>
                        updateTournamentDraftAction({
                          competitionId: competition.id,
                          location: locationValue,
                          matchFormat,
                          scheduledDate: dateValue,
                          scheduledTime: timeValue,
                          title: titleValue,
                        }),
                      )
                    }
                    type="button"
                  >
                    Сохранить изменения
                  </button>
                ) : null}
              </section>

              <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] md:px-3.5 md:py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-slate-700">
                    Участники
                  </h3>
                  <p className="text-[0.8rem] font-semibold text-slate-500">
                    {participantsCountLabel}
                  </p>
                </div>

                {canManageDraft ? (
                  <div className="mt-4 flex flex-col gap-2 md:mt-3 md:flex-row md:gap-1.5">
                    <div className="relative flex-1" ref={participantFieldRef}>
                      <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                        <SearchIcon />
                      </span>

                      <input
                        className="min-h-10 w-full rounded-[var(--radius-default)] border border-slate-200 bg-white pl-10 pr-3 text-[0.92rem] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 md:min-h-[2.125rem] md:px-2.5 md:pl-9 md:text-[0.86rem]"
                        disabled={participantOptions.length === 0}
                        onChange={(event) => {
                          setParticipantQuery(event.target.value);
                          setIsParticipantListOpen(true);
                        }}
                        onFocus={() => {
                          if (participantOptions.length > 0) {
                            setIsParticipantListOpen(true);
                          }
                        }}
                        placeholder={
                          participantOptions.length > 0
                            ? "Поиск участника"
                            : "Все доступные участники уже добавлены"
                        }
                        type="text"
                        value={participantInputValue}
                      />

                      {isParticipantListOpen ? (
                        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-[var(--radius-default)] border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
                          {participantOptions.length === 0 ? (
                            <p className="px-3 py-3 text-[0.84rem] text-slate-500">
                              Все доступные участники уже добавлены
                            </p>
                          ) : filteredParticipantOptions.length > 0 ? (
                            <ul className="max-h-56 overflow-y-auto py-1">
                              {filteredParticipantOptions.map((option) => (
                                <li key={option.id}>
                                  <button
                                    className="flex w-full items-center px-3 py-2.5 text-left text-[0.92rem] text-slate-700 transition hover:bg-slate-50"
                                    onClick={() => {
                                      setSelectedParticipantId(option.id);
                                      setParticipantQuery(option.name);
                                      setIsParticipantListOpen(false);
                                    }}
                                    type="button"
                                  >
                                    {option.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="px-3 py-3 text-[0.84rem] text-slate-500">
                              Ничего не найдено
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <button
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.88rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300 md:min-h-[2.125rem] md:px-3 md:text-[0.82rem]"
                      disabled={isPending || !effectiveSelectedParticipantId}
                      onClick={() =>
                        runMutation(
                          () =>
                            addTournamentParticipantAction({
                              competitionId: competition.id,
                              participantId: effectiveSelectedParticipantId,
                            }),
                          () => {
                            setParticipantQuery("");
                            setIsParticipantListOpen(false);
                          },
                        )
                      }
                      type="button"
                    >
                      <PlusIcon />
                      Добавить участника
                    </button>
                  </div>
                ) : null}

                {participants.length > 0 ? (
                  <div className="mt-4 space-y-2.5 md:mt-3 md:space-y-2">
                    {visibleParticipants.map((participant) => (
                      <div
                        key={participant.competitionParticipantId}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-default)] border border-slate-200 bg-slate-50/70 px-3 py-3 md:px-2.5 md:py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[0.94rem] font-medium text-slate-800 md:text-[0.88rem]">
                            {participant.seed ? `#${participant.seed} ` : ""}
                            {participant.displayName}
                          </p>
                          {participant.rating !== null ? (
                            <p className="mt-0.5 text-[0.78rem] text-slate-500 md:text-[0.72rem]">
                              {bracket.length > 0 ? "Текущий рейтинг" : "Рейтинг"}:{" "}
                              {participant.rating}
                            </p>
                          ) : null}
                        </div>

                        {canManageDraft ? (
                          <button
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-default)] text-slate-500 transition hover:bg-red-50 hover:text-red-600 md:h-8 md:w-8"
                            disabled={isPending}
                            onClick={() =>
                              runMutation(() =>
                                removeTournamentParticipantAction({
                                  competitionId: competition.id,
                                  participantId: participant.participantId,
                                }),
                              )
                            }
                            type="button"
                          >
                            <TrashIcon />
                          </button>
                        ) : null}
                      </div>
                    ))}

                    {shouldCollapseParticipants ? (
                      <button
                        className="inline-flex min-h-10 items-center justify-center self-start rounded-[var(--radius-default)] px-1 text-[0.88rem] font-medium text-blue-600 transition hover:text-blue-700"
                        onClick={() => setIsParticipantsExpanded((current) => !current)}
                        type="button"
                      >
                        {isParticipantsExpanded
                          ? "Свернуть"
                          : `Показать еще ${participants.length - 2}`}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[var(--radius-default)] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center md:mt-3 md:px-[0.875rem] md:py-[1.125rem]">
                    <p className="text-[0.92rem] text-slate-600 md:text-[0.84rem] md:leading-5">
                      {canManageDraft
                        ? "Пока нет участников. Добавьте участников, чтобы подготовить турнир к старту."
                        : "Организатор еще не добавил участников."}
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-[var(--radius-default)] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] md:px-3.5 md:py-3.5">
                <h3 className="text-[0.84rem] font-semibold uppercase tracking-[0.08em] text-slate-900">
                  Сетка
                </h3>

                {bracket.length > 0 ? (
                  <p className="mt-2 text-[0.82rem] text-slate-500 md:text-[0.74rem]">
                    После генерации сетки позиции игроков не меняются.
                  </p>
                ) : null}

                {bracket.length > 0 ? (
                  <div className="mt-4 md:mt-3">
                    <BracketView
                      bracket={bracket}
                      canOpenWinnerCelebration={competition.status === "completed"}
                      canReportResults={canReportResults}
                      onOpenWinnerCelebration={handleOpenWinnerCelebration}
                      onReportResult={setResultMatch}
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-[var(--radius-default)] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center md:mt-3 md:px-[0.875rem] md:py-[1.125rem]">
                    <p className="text-[0.92rem] text-slate-600 md:text-[0.84rem]">
                      Сетка еще не сформирована.
                    </p>
                    {canManageDraft ? (
                      <p className="mt-2 text-[0.82rem] leading-5 text-slate-500 md:text-[0.74rem] md:leading-[1.125rem]">
                        Для генерации сетки нужно минимум 2 участника. После генерации турнир перейдет в статус «идет».
                      </p>
                    ) : null}
                  </div>
                )}

                {canManageDraft ? (
                  <button
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-blue-500 bg-blue-500 px-4 text-[0.92rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300 md:mt-3 md:min-h-[2.375rem] md:px-[0.875rem] md:text-[0.86rem]"
                    disabled={isPending || !canGenerateBracket}
                    onClick={() =>
                      runMutation(() =>
                        generateTournamentBracketAction({
                          competitionId: competition.id,
                        }),
                      )
                    }
                    type="button"
                  >
                    СГЕНЕРИРОВАТЬ СЕТКУ
                  </button>
                ) : null}
              </section>

              {canManageDraft || canCancelTournament ? (
                <section className="space-y-2 pt-1">
                  {canCancelTournament ? (
                    <button
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-red-200 bg-red-50 px-4 text-[0.92rem] font-semibold text-red-700 transition hover:bg-red-100"
                      onClick={() => setShowCancelConfirm(true)}
                      type="button"
                    >
                      Отменить турнир
                    </button>
                  ) : null}

                  {canManageDraft ? (
                    <button
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-default)] border border-red-200 bg-red-50 px-4 text-[0.92rem] font-semibold text-red-700 transition hover:bg-red-100"
                      onClick={() => setShowDeleteConfirm(true)}
                      type="button"
                    >
                      Удалить турнир
                    </button>
                  ) : null}
                </section>
              ) : null}

              {feedbackMessage ? (
                <p className="rounded-[var(--radius-default)] border border-slate-200 bg-slate-50 px-3 py-2 text-[0.84rem] text-slate-600">
                  {feedbackMessage}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-[60] bg-slate-950/38 px-4 py-6 md:flex md:items-center md:justify-center">
          <section className="mx-auto mt-24 w-full max-w-[22rem] rounded-[var(--radius-default)] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.16)] md:mt-0">
            <h3 className="text-[1.05rem] font-semibold tracking-tight text-slate-900">
              Удалить турнир?
            </h3>
            <p className="mt-2 text-[0.9rem] leading-6 text-slate-500">
              Это действие нельзя отменить.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-white px-4 text-[0.88rem] font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setShowDeleteConfirm(false)}
                type="button"
              >
                Отмена
              </button>
              <button
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[var(--radius-default)] border border-red-200 bg-red-50 px-4 text-[0.88rem] font-semibold text-red-700 transition hover:bg-red-100"
                disabled={isPending}
                onClick={() =>
                  runMutation(
                    () =>
                      deleteTournamentDraftAction({
                        competitionId: competition.id,
                      }),
                    () => {
                      setShowDeleteConfirm(false);
                      router.replace(closeHref, { scroll: false });
                    },
                  )
                }
                type="button"
              >
                Удалить
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showCancelConfirm ? (
        <div className="fixed inset-0 z-[60] bg-slate-950/38 px-4 py-6 md:flex md:items-center md:justify-center">
          <section className="mx-auto mt-24 w-full max-w-[22rem] rounded-[var(--radius-default)] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.16)] md:mt-0">
            <h3 className="text-[1.05rem] font-semibold tracking-tight text-slate-900">
              Отменить турнир?
            </h3>
            <p className="mt-2 text-[0.9rem] leading-6 text-slate-500">
              Турнир будет переведен в статус «Отменен». Участники и история турнира сохранятся. Это действие нельзя отменить.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[var(--radius-default)] border border-slate-200 bg-white px-4 text-[0.88rem] font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setShowCancelConfirm(false)}
                type="button"
              >
                Назад
              </button>
              <button
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[var(--radius-default)] border border-red-200 bg-red-50 px-4 text-[0.88rem] font-semibold text-red-700 transition hover:bg-red-100"
                disabled={isPending}
                onClick={() =>
                  runMutation(
                    () =>
                      cancelTournamentAction({
                        competitionId: competition.id,
                      }),
                    () => {
                      setShowCancelConfirm(false);
                    },
                  )
                }
                type="button"
              >
                Отменить турнир
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <TournamentMatchResultSheet
        key={resultMatch?.id ?? "closed"}
        isOpen={resultMatch !== null}
        match={resultMatch}
        matchFormat={competition.matchFormat}
        onClose={() => setResultMatch(null)}
        onSubmit={(payload) =>
          saveTournamentMatchResultAction({
            competitionId: competition.id,
            competitionMatchId: payload.competitionMatchId,
            score: payload.score,
            winnerParticipantId: payload.winnerParticipantId,
          }).then((result) => {
            if (result.ok) {
              const currentResultMatch = resultMatch;

              if (
                currentResultMatch &&
                currentResultMatch.roundNumber === bracket.length
              ) {
                const celebrationData = createWinnerCelebrationData(currentResultMatch, {
                  score: payload.score,
                  winnerParticipantId: payload.winnerParticipantId,
                  winnerName:
                    payload.winnerParticipantId === currentResultMatch.slot1ParticipantId
                      ? currentResultMatch.slot1DisplayName ?? undefined
                      : currentResultMatch.slot2DisplayName ?? undefined,
                  winnerSeed:
                    payload.winnerParticipantId === currentResultMatch.slot1ParticipantId
                      ? currentResultMatch.slot1Seed
                      : currentResultMatch.slot2Seed,
                });

                if (celebrationData) {
                  window.sessionStorage.setItem(
                    celebrationStorageKey,
                    JSON.stringify(celebrationData),
                  );
                  setWinnerCelebration(celebrationData);
                }
              }

              setResultMatch(null);
              handleRefresh();
            }

            return result;
          })
        }
      />

      <WinnerCelebrationOverlay
        data={winnerCelebration}
        isOpen={winnerCelebration !== null}
        onClose={() => {
          window.sessionStorage.removeItem(celebrationStorageKey);
          setWinnerCelebration(null);
        }}
      />
    </>
  );
}
