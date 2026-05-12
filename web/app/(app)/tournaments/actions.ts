"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireCurrentViewer } from "@/src/auth/current-viewer";
import { db, schema } from "@/src/db";
import {
  ensureRankingExists,
  createCompetition,
  getCompetitionMatchById,
  getCompetitionForManagement,
  getCompetitionParticipants,
  getDefaultActivityType,
  getParticipantById,
  getParticipantByProfileAndActivity,
  isParticipantInCompetition,
  listCompetitionMatches,
  updateRankingByParticipantId,
} from "@/src/db/queries";
import { DEFAULT_ELO_RATING, calculateUpdatedRatings } from "@/src/rating/elo";
import {
  resolveTournamentRuntimeState,
  type TournamentRuntimeState,
  type TournamentStatus,
} from "@/src/tournaments/runtime-state";

const ALLOWED_MATCH_FORMATS = ["BO1", "BO3", "BO5"] as const;
const MAX_TITLE_LENGTH = 255;
const MAX_LOCATION_LENGTH = 255;

type MatchFormat = (typeof ALLOWED_MATCH_FORMATS)[number];
type WinnerKey = "player1" | "player2";

function isAllowedMatchFormat(value: string): value is MatchFormat {
  return ALLOWED_MATCH_FORMATS.includes(value as MatchFormat);
}

function parseMaxParticipants(value: number | string) {
  const normalized =
    typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);

  if (!Number.isSafeInteger(normalized) || normalized < 2) {
    return {
      ok: false as const,
      message: "Лимит участников должен быть целым числом не меньше 2.",
    };
  }

  return {
    ok: true as const,
    value: normalized,
  };
}

function parseOptionalScheduledAt(rawDate: string, rawTime: string) {
  const dateValue = rawDate.trim();
  const timeValue = rawTime.trim();

  if (!dateValue && !timeValue) {
    return { ok: true as const, value: null };
  }

  if (!dateValue && timeValue) {
    return {
      ok: false as const,
      message: "Укажите дату проведения или очистите поле времени.",
    };
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);

  if (!dateMatch) {
    return {
      ok: false as const,
      message: "Укажите корректную дату проведения.",
    };
  }

  const [, yearText, monthText, dayText] = dateMatch;
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);

  let hours = 0;
  let minutes = 0;

  if (timeValue) {
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);

    if (!timeMatch) {
      return {
        ok: false as const,
        message: "Укажите время в формате чч:мм.",
      };
    }

    hours = Number.parseInt(timeMatch[1], 10);
    minutes = Number.parseInt(timeMatch[2], 10);

    if (hours > 23 || minutes > 59) {
      return {
        ok: false as const,
        message: "Укажите корректное время в формате чч:мм.",
      };
    }
  }

  const scheduledAt = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    Number.isNaN(scheduledAt.getTime()) ||
    scheduledAt.getFullYear() !== year ||
    scheduledAt.getMonth() !== month - 1 ||
    scheduledAt.getDate() !== day
  ) {
    return {
      ok: false as const,
      message: "Укажите корректную дату проведения.",
    };
  }

  const now = new Date();

  if (timeValue) {
    if (scheduledAt.getTime() < now.getTime()) {
      return {
        ok: false as const,
        message: "Нельзя указать прошедшие дату и время турнира.",
      };
    }
  } else {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    if (scheduledAt.getTime() < today.getTime()) {
      return {
        ok: false as const,
        message: "Нельзя указать прошедшую дату турнира.",
      };
    }
  }

  return { ok: true as const, value: scheduledAt };
}

function parseRequiredScheduledAt(rawDate: string, rawHour: string, rawMinute: string) {
  const dateValue = rawDate.trim();
  const hourValue = rawHour.trim();
  const minuteValue = rawMinute.trim();

  if (!dateValue) {
    return {
      ok: false as const,
      message: "Укажите дату проведения.",
    };
  }

  if (!hourValue || !minuteValue) {
    return {
      ok: false as const,
      message: "Укажите время проведения.",
    };
  }

  return parseOptionalScheduledAt(dateValue, `${hourValue}:${minuteValue}`);
}

function buildTournamentActionError(message: string) {
  return { message, ok: false as const };
}

function buildTournamentActionSuccess(message?: string) {
  return { message, ok: true as const };
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

function getDefaultRankingValues(participantId: string) {
  return {
    participantId,
    rating: DEFAULT_ELO_RATING,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
  };
}

async function getManageableDraftCompetition(
  viewer: Awaited<ReturnType<typeof requireCurrentViewer>>,
  competitionId: string,
  database: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
) {
  const competitionResult = await getManageableCompetition(viewer, competitionId, database);

  if (!competitionResult.ok) {
    return competitionResult;
  }

  if (competitionResult.runtimeState.status !== "draft") {
    return buildTournamentActionError(
      "Редактирование доступно только для турнира в статусе «черновик».",
    );
  }

  return competitionResult;
}

async function getManageableCompetition(
  viewer: Awaited<ReturnType<typeof requireCurrentViewer>>,
  competitionId: string,
  database: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
) {
  const competitionData = await getCompetitionForManagement(competitionId, database);

  if (!competitionData) {
    return buildTournamentActionError("Турнир не найден.");
  }

  if (viewer.role !== "organizer" && viewer.role !== "admin") {
    return buildTournamentActionError("У вас нет прав для управления турниром.");
  }

  if (
    viewer.role === "organizer" &&
    competitionData.competition.createdByProfileId !== viewer.profileId
  ) {
    return buildTournamentActionError("Организатор может управлять только своим турниром.");
  }

  const bracket = await listCompetitionMatches(competitionId, database);
  const runtimeState = resolveTournamentRuntimeState({
    hasBracket: bracket.length > 0,
    scheduledAt: competitionData.competition.scheduledAt,
    status: competitionData.competition.status as TournamentStatus,
  });

  return { bracket, competitionData, ok: true as const, runtimeState, viewer };
}

async function getManageableInProgressCompetition(
  viewer: Awaited<ReturnType<typeof requireCurrentViewer>>,
  competitionId: string,
  database: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
) {
  const competitionResult = await getManageableCompetition(viewer, competitionId, database);

  if (!competitionResult.ok) {
    return competitionResult;
  }

  if (competitionResult.runtimeState.effectiveStatus !== "in_progress") {
    return buildTournamentActionError(
      "Ввод результата доступен только для турнира в статусе «идет».",
    );
  }

  return competitionResult;
}

function buildTournamentStateMessage(
  runtimeState: TournamentRuntimeState,
  allowedStatuses: TournamentStatus[],
) {
  if (runtimeState.isTerminal) {
    return "Для завершенного или отмененного турнира это действие недоступно.";
  }

  if (!allowedStatuses.includes(runtimeState.status)) {
    return "Текущее состояние турнира не позволяет выполнить это действие.";
  }

  return null;
}

type GeneratedBracketMatch = {
  completedAt: Date | null;
  competitionId: string;
  id: string;
  matchNumber: number;
  nextMatchId: string | null;
  nextMatchSlot: 1 | 2 | null;
  reportedByProfileId: string | null;
  resolutionType: "bye" | "played" | null;
  roundNumber: number;
  slot1ParticipantId: string | null;
  slot1Score: number | null;
  slot2ParticipantId: string | null;
  slot2Score: number | null;
  status: "completed" | "pending";
  winnerParticipantId: string | null;
};

type SeededParticipant = {
  participantId: string;
  rating: number;
};

function getBracketSize(participantCount: number) {
  let bracketSize = 1;

  while (bracketSize < participantCount) {
    bracketSize *= 2;
  }

  return bracketSize;
}

function shuffleParticipants<T>(items: T[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = nextItems[index];
    nextItems[index] = nextItems[swapIndex];
    nextItems[swapIndex] = currentValue;
  }

  return nextItems;
}

function buildSeedOrder(bracketSize: number) {
  let seedOrder = [1];

  while (seedOrder.length < bracketSize) {
    const nextSize = seedOrder.length * 2;
    seedOrder = seedOrder.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }

  return seedOrder;
}

function rankParticipantsForBracket(participants: SeededParticipant[]) {
  const participantsByRating = new Map<number, SeededParticipant[]>();

  for (const participant of participants) {
    const ratingGroup = participantsByRating.get(participant.rating);

    if (ratingGroup) {
      ratingGroup.push(participant);
      continue;
    }

    participantsByRating.set(participant.rating, [participant]);
  }

  const sortedRatings = [...participantsByRating.keys()].sort((left, right) => right - left);
  const rankedParticipants: SeededParticipant[] = [];

  for (const rating of sortedRatings) {
    const ratingGroup = participantsByRating.get(rating) ?? [];
    rankedParticipants.push(...shuffleParticipants(ratingGroup));
  }

  return rankedParticipants;
}

function buildSeedSlots(participants: SeededParticipant[]) {
  const bracketSize = getBracketSize(participants.length);
  const seedOrder = buildSeedOrder(bracketSize);
  const seededParticipants = rankParticipantsForBracket(participants);
  const participantsBySeed = new Map<number, string>();

  for (let index = 0; index < seededParticipants.length; index += 1) {
    participantsBySeed.set(index + 1, seededParticipants[index].participantId);
  }

  return seedOrder.map((seed) => participantsBySeed.get(seed) ?? null);
}

function buildBracketMatches(competitionId: string, participants: SeededParticipant[]) {
  const firstRoundSlots = buildSeedSlots(participants);
  const allRounds: GeneratedBracketMatch[][] = [];
  const firstRoundMatches: GeneratedBracketMatch[] = [];

  for (let index = 0; index < firstRoundSlots.length; index += 2) {
    const slot1ParticipantId = firstRoundSlots[index] ?? null;
    const slot2ParticipantId = firstRoundSlots[index + 1] ?? null;
    const hasBye = Boolean(slot1ParticipantId) !== Boolean(slot2ParticipantId);

    firstRoundMatches.push({
      completedAt: hasBye ? new Date() : null,
      competitionId,
      id: crypto.randomUUID(),
      matchNumber: firstRoundMatches.length + 1,
      nextMatchId: null,
      nextMatchSlot: null,
      reportedByProfileId: null,
      resolutionType: hasBye ? "bye" : null,
      roundNumber: 1,
      slot1ParticipantId,
      slot1Score: null,
      slot2ParticipantId,
      slot2Score: null,
      status: hasBye ? "completed" : "pending",
      winnerParticipantId: hasBye ? slot1ParticipantId ?? slot2ParticipantId : null,
    });
  }

  allRounds.push(firstRoundMatches);

  while (allRounds.at(-1)?.length && allRounds.at(-1)!.length > 1) {
    const previousRound = allRounds.at(-1)!;
    const nextRound: GeneratedBracketMatch[] = [];

    for (let index = 0; index < previousRound.length; index += 2) {
      const left = previousRound[index];
      const right = previousRound[index + 1];
      const nextMatchId = crypto.randomUUID();

      left.nextMatchId = nextMatchId;
      left.nextMatchSlot = 1;

      if (right) {
        right.nextMatchId = nextMatchId;
        right.nextMatchSlot = 2;
      }

      nextRound.push({
        completedAt: null,
        competitionId,
        id: nextMatchId,
        matchNumber: nextRound.length + 1,
        nextMatchId: null,
        nextMatchSlot: null,
        reportedByProfileId: null,
        resolutionType: null,
        roundNumber: left.roundNumber + 1,
        slot1ParticipantId:
          left.status === "completed" && left.resolutionType === "bye"
            ? left.winnerParticipantId
            : null,
        slot1Score: null,
        slot2ParticipantId:
          right?.status === "completed" && right.resolutionType === "bye"
            ? right.winnerParticipantId
            : null,
        slot2Score: null,
        status: "pending" as const,
        winnerParticipantId: null,
      });
    }

    allRounds.push(nextRound);
  }

  return allRounds.flat();
}

export async function createTournamentAction(
  _previousState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const viewer = await requireCurrentViewer();

  if (viewer.role !== "organizer" && viewer.role !== "admin") {
    return {
      error: "Только организатор или администратор может создавать турниры.",
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const matchFormatValue = String(formData.get("matchFormat") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const maxParticipantsValue = String(formData.get("maxParticipants") ?? "").trim();
  const rawDate = String(formData.get("scheduledDate") ?? "");
  const rawHour = String(formData.get("scheduledHour") ?? "");
  const rawMinute = String(formData.get("scheduledMinute") ?? "");

  if (!title) {
    return { error: "Введите название турнира." };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return { error: "Название турнира слишком длинное." };
  }

  if (!isAllowedMatchFormat(matchFormatValue)) {
    return { error: "Выберите формат матчей: BO1, BO3 или BO5." };
  }

  if (location.length > MAX_LOCATION_LENGTH) {
    return { error: "Локация указана слишком длинно." };
  }

  const parsedMaxParticipants = parseMaxParticipants(maxParticipantsValue);

  if (!parsedMaxParticipants.ok) {
    return { error: parsedMaxParticipants.message };
  }

  const parsedScheduledAt = parseRequiredScheduledAt(rawDate, rawHour, rawMinute);

  if (!parsedScheduledAt.ok) {
    return { error: parsedScheduledAt.message };
  }

  const activityType = await getDefaultActivityType();

  if (!activityType) {
    throw new Error("Default activity type is missing");
  }

  const competition = await createCompetition({
    activityTypeId: activityType.id,
    title,
    format: "single_elimination",
    matchFormat: matchFormatValue,
    status: "draft",
    maxParticipants: parsedMaxParticipants.value,
    scheduledAt: parsedScheduledAt.value,
    location: location || null,
    createdByProfileId: viewer.profileId,
    startedAt: null,
    completedAt: null,
  });

  revalidatePath("/tournaments");
  redirect(`/tournaments/${competition.id}`);
}

export async function updateTournamentDraftAction(input: {
  competitionId: string;
  location: string;
  maxParticipants: number;
  matchFormat: string;
  scheduledDate: string;
  scheduledTime: string;
  title: string;
}) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionResult = await getManageableDraftCompetition(
      viewer,
      input.competitionId,
      tx,
    );

    if (!competitionResult.ok) {
      return competitionResult;
    }

    if (!isAllowedMatchFormat(input.matchFormat)) {
      return buildTournamentActionError("Выберите формат матчей: BO1, BO3 или BO5.");
    }

    const title = input.title.trim();

    if (!title) {
      return buildTournamentActionError("Введите название турнира.");
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return buildTournamentActionError("Название турнира слишком длинное.");
    }

    if (input.location.trim().length > MAX_LOCATION_LENGTH) {
      return buildTournamentActionError("Локация указана слишком длинно.");
    }

    const parsedMaxParticipants = parseMaxParticipants(input.maxParticipants);

    if (!parsedMaxParticipants.ok) {
      return buildTournamentActionError(parsedMaxParticipants.message);
    }

    const parsedScheduledAt = parseOptionalScheduledAt(
      input.scheduledDate,
      input.scheduledTime,
    );

    if (!parsedScheduledAt.ok) {
      return buildTournamentActionError(parsedScheduledAt.message);
    }

    await tx
      .update(schema.competitions)
      .set({
        title,
        location: input.location.trim() || null,
        maxParticipants: parsedMaxParticipants.value,
        matchFormat: input.matchFormat,
        scheduledAt: parsedScheduledAt.value,
        updatedAt: new Date(),
      })
      .where(eq(schema.competitions.id, input.competitionId));

    return buildTournamentActionSuccess("Изменения сохранены.");
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${input.competitionId}`);

  return result;
}

export async function addTournamentParticipantAction(input: {
  competitionId: string;
  participantId: string;
}) {
  const viewer = await requireCurrentViewer();

  return db.transaction(async (tx) => {
    const competitionResult = await getManageableCompetition(
      viewer,
      input.competitionId,
      tx,
    );

    if (!competitionResult.ok) {
      return competitionResult;
    }

    const invalidStateMessage = buildTournamentStateMessage(competitionResult.runtimeState, [
      "draft",
      "registration",
    ]);

    if (invalidStateMessage) {
      return buildTournamentActionError(invalidStateMessage);
    }

    const participants = await getCompetitionParticipants(input.competitionId, tx);

    if (
      participants.length >= competitionResult.competitionData.competition.maxParticipants
    ) {
      return buildTournamentActionError("Достигнут лимит участников турнира.");
    }

    const participant = await getParticipantById(input.participantId, tx);

    if (!participant || !participant.isActive) {
      return buildTournamentActionError("Выберите активного участника.");
    }

    if (participant.activityTypeId !== competitionResult.competitionData.competition.activityTypeId) {
      return buildTournamentActionError(
        "Участник должен относиться к той же активности, что и турнир.",
      );
    }

    const alreadyAdded = await isParticipantInCompetition(
      input.competitionId,
      input.participantId,
      tx,
    );

    if (alreadyAdded) {
      return buildTournamentActionError("Этот участник уже добавлен в турнир.");
    }

    await tx.insert(schema.competitionParticipants).values({
      addedByProfileId: competitionResult.viewer.profileId,
      competitionId: input.competitionId,
      participantId: input.participantId,
    });

    return buildTournamentActionSuccess("Участник добавлен.");
  });
}

export async function removeTournamentParticipantAction(input: {
  competitionId: string;
  participantId: string;
}) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionResult = await getManageableCompetition(viewer, input.competitionId, tx);

    if (!competitionResult.ok) {
      return competitionResult;
    }

    const invalidStateMessage = buildTournamentStateMessage(competitionResult.runtimeState, [
      "draft",
      "registration",
    ]);

    if (invalidStateMessage) {
      return buildTournamentActionError(invalidStateMessage);
    }

    const [removedParticipant] = await tx
      .delete(schema.competitionParticipants)
      .where(
        and(
          eq(schema.competitionParticipants.competitionId, input.competitionId),
          eq(schema.competitionParticipants.participantId, input.participantId),
        ),
      )
      .returning();

    if (!removedParticipant) {
      return buildTournamentActionError("Участник не найден в этом турнире.");
    }

    return buildTournamentActionSuccess("Участник удален.");
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${input.competitionId}`);

  return result;
}

export async function generateTournamentBracketAction(input: { competitionId: string }) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionResult = await getManageableCompetition(viewer, input.competitionId, tx);

    if (!competitionResult.ok) {
      return competitionResult;
    }

    const invalidStateMessage = buildTournamentStateMessage(competitionResult.runtimeState, [
      "ready",
    ]);

    if (invalidStateMessage) {
      return buildTournamentActionError(invalidStateMessage);
    }

    const participants = await getCompetitionParticipants(input.competitionId, tx);

    if (participants.length < 2) {
      return buildTournamentActionError(
        "Для генерации сетки нужно добавить минимум двух участников.",
      );
    }

    const existingMatches = competitionResult.bracket;

    if (existingMatches.length > 0) {
      return buildTournamentActionError("Сетка для этого турнира уже сформирована.");
    }

    const seededParticipants = participants.map((entry) => ({
      participantId: entry.participant.id,
      rating: entry.ranking?.rating ?? 1000,
    }));
    const bracketMatches = buildBracketMatches(input.competitionId, seededParticipants);

    await tx.insert(schema.competitionMatches).values(bracketMatches);

    return buildTournamentActionSuccess("Сетка сформирована.");
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${input.competitionId}`);

  return result;
}

export async function openTournamentRegistrationAction(input: {
  competitionId: string;
}) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionResult = await getManageableCompetition(viewer, input.competitionId, tx);

    if (!competitionResult.ok) {
      return competitionResult;
    }

    const invalidStateMessage = buildTournamentStateMessage(competitionResult.runtimeState, [
      "draft",
      "ready",
    ]);

    if (invalidStateMessage) {
      return buildTournamentActionError(invalidStateMessage);
    }

    if (
      competitionResult.runtimeState.status === "ready" &&
      competitionResult.runtimeState.hasBracket
    ) {
      return buildTournamentActionError(
        "Нельзя возобновить регистрацию после генерации сетки.",
      );
    }

    await tx
      .update(schema.competitions)
      .set({
        status: "registration",
        updatedAt: new Date(),
      })
      .where(eq(schema.competitions.id, input.competitionId));

    return buildTournamentActionSuccess("Регистрация открыта.");
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${input.competitionId}`);

  return result;
}

export async function closeTournamentRegistrationAction(input: {
  competitionId: string;
}) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionResult = await getManageableCompetition(viewer, input.competitionId, tx);

    if (!competitionResult.ok) {
      return competitionResult;
    }

    const invalidStateMessage = buildTournamentStateMessage(competitionResult.runtimeState, [
      "registration",
    ]);

    if (invalidStateMessage) {
      return buildTournamentActionError(invalidStateMessage);
    }

    const participants = await getCompetitionParticipants(input.competitionId, tx);

    if (participants.length < 2) {
      return buildTournamentActionError(
        "Чтобы закрыть регистрацию и перевести турнир в готовность, нужно минимум два участника.",
      );
    }

    await tx
      .update(schema.competitions)
      .set({
        status: "ready",
        updatedAt: new Date(),
      })
      .where(eq(schema.competitions.id, input.competitionId));

    return buildTournamentActionSuccess("Регистрация закрыта. Турнир готов к генерации сетки.");
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${input.competitionId}`);

  return result;
}

export async function moveTournamentToReadyAction(input: { competitionId: string }) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionResult = await getManageableCompetition(viewer, input.competitionId, tx);

    if (!competitionResult.ok) {
      return competitionResult;
    }

    const invalidStateMessage = buildTournamentStateMessage(competitionResult.runtimeState, [
      "draft",
    ]);

    if (invalidStateMessage) {
      return buildTournamentActionError(invalidStateMessage);
    }

    const participants = await getCompetitionParticipants(input.competitionId, tx);

    if (participants.length < 2) {
      return buildTournamentActionError(
        "Чтобы перевести турнир в готовность, нужно минимум два участника.",
      );
    }

    await tx
      .update(schema.competitions)
      .set({
        status: "ready",
        updatedAt: new Date(),
      })
      .where(eq(schema.competitions.id, input.competitionId));

    return buildTournamentActionSuccess("Турнир переведен в статус «готов».");
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${input.competitionId}`);

  return result;
}

export async function registerToTournamentAction(input: { competitionId: string }) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionData = await getCompetitionForManagement(input.competitionId, tx);

    if (!competitionData) {
      return buildTournamentActionError("Турнир не найден.");
    }

    const bracket = await listCompetitionMatches(input.competitionId, tx);
    const runtimeState = resolveTournamentRuntimeState({
      hasBracket: bracket.length > 0,
      scheduledAt: competitionData.competition.scheduledAt,
      status: competitionData.competition.status as TournamentStatus,
    });

    const invalidStateMessage = buildTournamentStateMessage(runtimeState, ["registration"]);

    if (invalidStateMessage) {
      return buildTournamentActionError(invalidStateMessage);
    }

    if (viewer.role === "admin") {
      return buildTournamentActionError(
        "Администратор управляет турнирами без самостоятельной регистрации.",
      );
    }

    if (
      viewer.role === "organizer" &&
      competitionData.competition.createdByProfileId === viewer.profileId
    ) {
      return buildTournamentActionError(
        "Организатор собственного турнира добавляет участников вручную.",
      );
    }

    if (runtimeState.hasBracket) {
      return buildTournamentActionError("Регистрация недоступна после генерации сетки.");
    }

    const participant = await getParticipantByProfileAndActivity(
      viewer.profileId,
      competitionData.competition.activityTypeId,
      tx,
    );

    if (!participant || !participant.isActive) {
      return buildTournamentActionError("Не удалось найти активного участника для регистрации.");
    }

    const alreadyRegistered = await isParticipantInCompetition(
      input.competitionId,
      participant.id,
      tx,
    );

    if (alreadyRegistered) {
      return buildTournamentActionError("Вы уже зарегистрированы в этом турнире.");
    }

    const participants = await getCompetitionParticipants(input.competitionId, tx);

    if (participants.length >= competitionData.competition.maxParticipants) {
      return buildTournamentActionError("Достигнут лимит участников турнира.");
    }

    await tx.insert(schema.competitionParticipants).values({
      addedByProfileId: viewer.profileId,
      competitionId: input.competitionId,
      participantId: participant.id,
    });

    return buildTournamentActionSuccess("Вы зарегистрированы.");
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${input.competitionId}`);

  return result;
}

export async function unregisterFromTournamentAction(input: { competitionId: string }) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionData = await getCompetitionForManagement(input.competitionId, tx);

    if (!competitionData) {
      return buildTournamentActionError("Турнир не найден.");
    }

    const bracket = await listCompetitionMatches(input.competitionId, tx);
    const runtimeState = resolveTournamentRuntimeState({
      hasBracket: bracket.length > 0,
      scheduledAt: competitionData.competition.scheduledAt,
      status: competitionData.competition.status as TournamentStatus,
    });

    const invalidStateMessage = buildTournamentStateMessage(runtimeState, ["registration"]);

    if (invalidStateMessage) {
      return buildTournamentActionError(invalidStateMessage);
    }

    if (runtimeState.hasBracket) {
      return buildTournamentActionError("Нельзя отменить регистрацию после генерации сетки.");
    }

    const participant = await getParticipantByProfileAndActivity(
      viewer.profileId,
      competitionData.competition.activityTypeId,
      tx,
    );

    if (!participant || !participant.isActive) {
      return buildTournamentActionError("Активный участник не найден.");
    }

    const [removedParticipant] = await tx
      .delete(schema.competitionParticipants)
      .where(
        and(
          eq(schema.competitionParticipants.competitionId, input.competitionId),
          eq(schema.competitionParticipants.participantId, participant.id),
        ),
      )
      .returning();

    if (!removedParticipant) {
      return buildTournamentActionError("Вы не зарегистрированы в этом турнире.");
    }

    return buildTournamentActionSuccess("Регистрация отменена.");
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${input.competitionId}`);

  return result;
}

export async function deleteTournamentDraftAction(input: { competitionId: string }) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionResult = await getManageableDraftCompetition(
      viewer,
      input.competitionId,
      tx,
    );

    if (!competitionResult.ok) {
      return competitionResult;
    }

    await tx
      .delete(schema.competitionMatches)
      .where(eq(schema.competitionMatches.competitionId, input.competitionId));

    await tx
      .delete(schema.competitionParticipants)
      .where(eq(schema.competitionParticipants.competitionId, input.competitionId));

    await tx
      .delete(schema.competitions)
      .where(eq(schema.competitions.id, input.competitionId));

    return buildTournamentActionSuccess("Турнир удален.");
  });

  revalidatePath("/tournaments");

  return result;
}

export async function cancelTournamentAction(input: { competitionId: string }) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionResult = await getManageableCompetition(
      viewer,
      input.competitionId,
      tx,
    );

    if (!competitionResult.ok) {
      return competitionResult;
    }

    if (competitionResult.runtimeState.isTerminal) {
      return buildTournamentActionError(
        "Для завершенного или отмененного турнира это действие недоступно.",
      );
    }

    if (competitionResult.runtimeState.status === "draft") {
      return buildTournamentActionError(
        "Черновик можно удалить, а не отменить.",
      );
    }

    const hasPlayedCompletedMatches = competitionResult.bracket.some(
      (match) =>
        match.competitionMatch.status === "completed" &&
        match.competitionMatch.resolutionType === "played",
    );

    if (hasPlayedCompletedMatches) {
      return buildTournamentActionError(
        "Нельзя отменить турнир после уже сыгранных матчей.",
      );
    }

    await tx
      .update(schema.competitions)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(schema.competitions.id, input.competitionId));

    return buildTournamentActionSuccess("Турнир отменен.");
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${input.competitionId}`);

  return result;
}

export async function saveTournamentMatchResultAction(input: {
  competitionId: string;
  competitionMatchId: string;
  score: {
    player1: number;
    player2: number;
  };
  winnerParticipantId: string;
}) {
  const viewer = await requireCurrentViewer();
  const result = await db.transaction(async (tx) => {
    const competitionResult = await getManageableInProgressCompetition(
      viewer,
      input.competitionId,
      tx,
    );

    if (!competitionResult.ok) {
      return competitionResult;
    }

    const competitionMatch = await getCompetitionMatchById(input.competitionMatchId, tx);

    if (!competitionMatch) {
      return buildTournamentActionError("Турнирный матч не найден.");
    }

    if (competitionMatch.competitionMatch.competitionId !== input.competitionId) {
      return buildTournamentActionError("Матч не принадлежит указанному турниру.");
    }

    if (competitionMatch.competitionMatch.status === "completed") {
      return buildTournamentActionError("Результат этого матча уже сохранен.");
    }

    if (competitionMatch.competitionMatch.resolutionType === "bye") {
      return buildTournamentActionError("Матч с автопроходом не требует ручного результата.");
    }

    const slot1ParticipantId = competitionMatch.competitionMatch.slot1ParticipantId;
    const slot2ParticipantId = competitionMatch.competitionMatch.slot2ParticipantId;

    if (!slot1ParticipantId || !slot2ParticipantId) {
      return buildTournamentActionError(
        "Результат можно внести только после определения обоих участников матча.",
      );
    }

    if (
      input.winnerParticipantId !== slot1ParticipantId &&
      input.winnerParticipantId !== slot2ParticipantId
    ) {
      return buildTournamentActionError("Победитель должен быть одним из участников матча.");
    }

    const matchFormat = competitionMatch.competition.matchFormat;

    if (!isAllowedMatchFormat(matchFormat)) {
      throw new Error("Unsupported competition match format");
    }

    if (!isValidCompletedScore(matchFormat, input.score)) {
      return buildTournamentActionError("Итоговый счет не соответствует формату матча.");
    }

    const winnerByScore = getWinnerByScore(input.score);

    if (!winnerByScore) {
      return buildTournamentActionError("Ничья в турнирном матче не поддерживается.");
    }

    const expectedWinnerParticipantId =
      winnerByScore === "player1" ? slot1ParticipantId : slot2ParticipantId;

    if (expectedWinnerParticipantId !== input.winnerParticipantId) {
      return buildTournamentActionError("Победитель должен соответствовать итоговому счету.");
    }

    const [updatedMatch] = await tx
      .update(schema.competitionMatches)
      .set({
        slot1Score: input.score.player1,
        slot2Score: input.score.player2,
        winnerParticipantId: input.winnerParticipantId,
        status: "completed",
        resolutionType: "played",
        reportedByProfileId: viewer.profileId,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.competitionMatches.id, input.competitionMatchId),
          eq(schema.competitionMatches.status, "pending"),
        ),
      )
      .returning();

    if (!updatedMatch) {
      return buildTournamentActionError("Результат этого матча уже был сохранен ранее.");
    }

    const slot1Ranking = await ensureRankingExists(
      getDefaultRankingValues(slot1ParticipantId),
      tx,
    );
    const slot2Ranking = await ensureRankingExists(
      getDefaultRankingValues(slot2ParticipantId),
      tx,
    );

    if (!slot1Ranking || !slot2Ranking) {
      throw new Error("Failed to provision rankings for tournament match participants");
    }

    const updatedRatings = calculateUpdatedRatings(
      slot1Ranking.rating,
      slot2Ranking.rating,
      winnerByScore,
    );

    await updateRankingByParticipantId(
      slot1ParticipantId,
      {
        rating: updatedRatings.player1Rating,
        matchesPlayed: slot1Ranking.matchesPlayed + 1,
        wins: slot1Ranking.wins + (winnerByScore === "player1" ? 1 : 0),
        losses: slot1Ranking.losses + (winnerByScore === "player2" ? 1 : 0),
      },
      tx,
    );

    await updateRankingByParticipantId(
      slot2ParticipantId,
      {
        rating: updatedRatings.player2Rating,
        matchesPlayed: slot2Ranking.matchesPlayed + 1,
        wins: slot2Ranking.wins + (winnerByScore === "player2" ? 1 : 0),
        losses: slot2Ranking.losses + (winnerByScore === "player1" ? 1 : 0),
      },
      tx,
    );

    if (competitionMatch.competitionMatch.nextMatchId && competitionMatch.competitionMatch.nextMatchSlot) {
      const nextMatch = await getCompetitionMatchById(
        competitionMatch.competitionMatch.nextMatchId,
        tx,
      );

      if (!nextMatch) {
        return buildTournamentActionError("Не удалось найти следующий матч сетки.");
      }

      if (nextMatch.competitionMatch.competitionId !== input.competitionId) {
        return buildTournamentActionError("Следующий матч относится к другому турниру.");
      }

      const slotField =
        competitionMatch.competitionMatch.nextMatchSlot === 1
          ? "slot1ParticipantId"
          : "slot2ParticipantId";
      const existingParticipantId = nextMatch.competitionMatch[slotField];

      if (existingParticipantId && existingParticipantId !== input.winnerParticipantId) {
        return buildTournamentActionError(
          "Сетка уже содержит другого участника в следующем слоте.",
        );
      }

      if (!existingParticipantId) {
        await tx
          .update(schema.competitionMatches)
          .set({
            [slotField]: input.winnerParticipantId,
            updatedAt: new Date(),
          })
          .where(eq(schema.competitionMatches.id, nextMatch.competitionMatch.id));
      }
    } else {
      await tx
        .update(schema.competitions)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.competitions.id, input.competitionId));
    }

    return buildTournamentActionSuccess("Результат матча сохранен.");
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${input.competitionId}`);
  revalidatePath("/ranking");
  revalidatePath("/profile");

  return result;
}
