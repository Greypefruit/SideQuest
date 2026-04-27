"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentViewer } from "@/src/auth/current-viewer";
import { db } from "@/src/db";
import {
  createMatch,
  ensureRankingExists,
  getDefaultActivityType,
  getParticipantById,
  getParticipantByProfileAndActivity,
  getProfileById,
  updateRankingByParticipantId,
} from "@/src/db/queries";

const ELO_K_FACTOR = 32;
const ALLOWED_MATCH_FORMATS = ["BO1", "BO3", "BO5"] as const;

type MatchFormat = (typeof ALLOWED_MATCH_FORMATS)[number];
type WinnerKey = "player1" | "player2";

type CreateCompletedMatchInput = {
  opponentParticipantId: string;
  format: MatchFormat;
  winner: WinnerKey;
  score: {
    player1: number;
    player2: number;
  };
};

type CreateCompletedMatchResult =
  | { ok: true; matchId: string }
  | { ok: false; message: string };

function isAllowedMatchFormat(value: string): value is MatchFormat {
  return ALLOWED_MATCH_FORMATS.includes(value as MatchFormat);
}

function isValidCompletedScore(
  format: MatchFormat,
  score: {
    player1: number;
    player2: number;
  },
) {
  const { player1, player2 } = score;

  if (
    !Number.isInteger(player1) ||
    !Number.isInteger(player2) ||
    player1 < 0 ||
    player2 < 0
  ) {
    return false;
  }

  if (format === "BO1") {
    return (
      (player1 === 1 && player2 === 0) ||
      (player1 === 0 && player2 === 1)
    );
  }

  if (format === "BO3") {
    return (
      (player1 === 2 && (player2 === 0 || player2 === 1)) ||
      (player2 === 2 && (player1 === 0 || player1 === 1))
    );
  }

  return (
    (player1 === 3 && (player2 === 0 || player2 === 1 || player2 === 2)) ||
    (player2 === 3 && (player1 === 0 || player1 === 1 || player1 === 2))
  );
}

function getWinnerByScore(score: { player1: number; player2: number }): WinnerKey | null {
  if (score.player1 === score.player2) {
    return null;
  }

  return score.player1 > score.player2 ? "player1" : "player2";
}

function calculateUpdatedRatings(
  player1Rating: number,
  player2Rating: number,
  winner: WinnerKey,
) {
  const player1ActualScore = winner === "player1" ? 1 : 0;
  const player1ExpectedScore =
    1 / (1 + 10 ** ((player2Rating - player1Rating) / 400));
  const player1Delta = Math.round(
    ELO_K_FACTOR * (player1ActualScore - player1ExpectedScore),
  );

  return {
    player1Rating: player1Rating + player1Delta,
    player2Rating: player2Rating - player1Delta,
  };
}

function getDefaultRankingValues(participantId: string) {
  return {
    participantId,
    rating: 1000,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
  };
}

export async function createCompletedMatchAction(
  input: CreateCompletedMatchInput,
): Promise<CreateCompletedMatchResult> {
  const viewer = await requireCurrentViewer();

  if (!input.opponentParticipantId) {
    return { ok: false, message: "Сначала выберите соперника." };
  }

  if (!isAllowedMatchFormat(input.format)) {
    return { ok: false, message: "Выберите корректный формат матча." };
  }

  if (input.winner !== "player1" && input.winner !== "player2") {
    return { ok: false, message: "Сначала укажите победителя." };
  }

  if (!isValidCompletedScore(input.format, input.score)) {
    return { ok: false, message: "Итоговый счет не соответствует формату матча." };
  }

  const winnerByScore = getWinnerByScore(input.score);

  if (!winnerByScore || winnerByScore !== input.winner) {
    return { ok: false, message: "Победитель должен соответствовать итоговому счету." };
  }

  const activityType = await getDefaultActivityType();

  if (!activityType) {
    throw new Error("Default activity type is missing");
  }

  const result = await db.transaction(async (tx) => {
    const viewerParticipant = await getParticipantByProfileAndActivity(
      viewer.profileId,
      activityType.id,
      tx,
    );

    if (!viewerParticipant || !viewerParticipant.isActive) {
      return {
        ok: false as const,
        message: "Не удалось определить активного участника для текущего пользователя.",
      };
    }

    const opponentParticipant = await getParticipantById(input.opponentParticipantId, tx);

    if (
      !opponentParticipant ||
      !opponentParticipant.isActive ||
      opponentParticipant.activityTypeId !== activityType.id
    ) {
      return {
        ok: false as const,
        message: "Выберите доступного соперника из текущей активности.",
      };
    }

    if (opponentParticipant.profileId === viewer.profileId) {
      return { ok: false as const, message: "Нельзя создать матч с самим собой." };
    }

    const opponentProfile = await getProfileById(opponentParticipant.profileId, tx);

    if (!opponentProfile?.isActive) {
      return {
        ok: false as const,
        message: "Выбранный соперник сейчас недоступен.",
      };
    }

    const viewerRanking = await ensureRankingExists(
      getDefaultRankingValues(viewerParticipant.id),
      tx,
    );
    const opponentRanking = await ensureRankingExists(
      getDefaultRankingValues(opponentParticipant.id),
      tx,
    );

    if (!viewerRanking || !opponentRanking) {
      throw new Error("Failed to provision rankings for match participants");
    }

    const winnerParticipantId =
      input.winner === "player1" ? viewerParticipant.id : opponentParticipant.id;
    const playedAt = new Date();

    const createdMatch = await createMatch(
      {
        activityTypeId: activityType.id,
        participant1Id: viewerParticipant.id,
        participant2Id: opponentParticipant.id,
        matchFormat: input.format,
        participant1Score: input.score.player1,
        participant2Score: input.score.player2,
        winnerParticipantId,
        createdByProfileId: viewer.profileId,
        playedAt,
      },
      tx,
    );

    const updatedRatings = calculateUpdatedRatings(
      viewerRanking.rating,
      opponentRanking.rating,
      input.winner,
    );

    await updateRankingByParticipantId(
      viewerParticipant.id,
      {
        rating: updatedRatings.player1Rating,
        matchesPlayed: viewerRanking.matchesPlayed + 1,
        wins: viewerRanking.wins + (input.winner === "player1" ? 1 : 0),
        losses: viewerRanking.losses + (input.winner === "player2" ? 1 : 0),
      },
      tx,
    );

    await updateRankingByParticipantId(
      opponentParticipant.id,
      {
        rating: updatedRatings.player2Rating,
        matchesPlayed: opponentRanking.matchesPlayed + 1,
        wins: opponentRanking.wins + (input.winner === "player2" ? 1 : 0),
        losses: opponentRanking.losses + (input.winner === "player1" ? 1 : 0),
      },
      tx,
    );

    return { ok: true as const, matchId: createdMatch.id };
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/matches");
  revalidatePath("/ranking");
  revalidatePath("/profile");

  return result;
}
