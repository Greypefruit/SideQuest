"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireCurrentViewer } from "@/src/auth/current-viewer";
import { db, schema } from "@/src/db";
import {
  createCompetition,
  getCompetitionForManagement,
  getCompetitionParticipants,
  getDefaultActivityType,
  getParticipantById,
  isParticipantInCompetition,
  listCompetitionMatches,
} from "@/src/db/queries";

const ALLOWED_MATCH_FORMATS = ["BO1", "BO3", "BO5"] as const;
const MAX_TITLE_LENGTH = 255;
const MAX_LOCATION_LENGTH = 255;

type MatchFormat = (typeof ALLOWED_MATCH_FORMATS)[number];

function isAllowedMatchFormat(value: string): value is MatchFormat {
  return ALLOWED_MATCH_FORMATS.includes(value as MatchFormat);
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

  return { ok: true as const, value: scheduledAt };
}

function buildTournamentActionError(message: string) {
  return { message, ok: false as const };
}

function buildTournamentActionSuccess(message?: string) {
  return { message, ok: true as const };
}

async function getManageableDraftCompetition(
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

  if (competitionData.competition.status !== "draft") {
    return buildTournamentActionError(
      "Редактирование доступно только для турнира в статусе «черновик».",
    );
  }

  return { competitionData, ok: true as const, viewer };
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
  const rawDate = String(formData.get("scheduledDate") ?? "");
  const rawTime = String(formData.get("scheduledTime") ?? "");

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

  const parsedScheduledAt = parseOptionalScheduledAt(rawDate, rawTime);

  if (!parsedScheduledAt.ok) {
    return { error: parsedScheduledAt.message };
  }

  const activityType = await getDefaultActivityType();

  if (!activityType) {
    throw new Error("Default activity type is missing");
  }

  await createCompetition({
    activityTypeId: activityType.id,
    title,
    format: "single_elimination",
    matchFormat: matchFormatValue,
    status: "draft",
    scheduledAt: parsedScheduledAt.value,
    location: location || null,
    createdByProfileId: viewer.profileId,
    startedAt: null,
    completedAt: null,
  });

  revalidatePath("/tournaments");
  redirect("/tournaments?tab=my");
}

export async function updateTournamentDraftAction(input: {
  competitionId: string;
  location: string;
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
    const competitionResult = await getManageableDraftCompetition(
      viewer,
      input.competitionId,
      tx,
    );

    if (!competitionResult.ok) {
      return competitionResult;
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
    const competitionResult = await getManageableDraftCompetition(
      viewer,
      input.competitionId,
      tx,
    );

    if (!competitionResult.ok) {
      return competitionResult;
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
    const competitionResult = await getManageableDraftCompetition(
      viewer,
      input.competitionId,
      tx,
    );

    if (!competitionResult.ok) {
      return competitionResult;
    }

    const participants = await getCompetitionParticipants(input.competitionId, tx);

    if (participants.length < 2) {
      return buildTournamentActionError(
        "Для генерации сетки нужно добавить минимум двух участников.",
      );
    }

    const existingMatches = await listCompetitionMatches(input.competitionId, tx);

    if (existingMatches.length > 0) {
      return buildTournamentActionError("Сетка для этого турнира уже сформирована.");
    }

    const seededParticipants = participants.map((entry) => ({
      participantId: entry.participant.id,
      rating: entry.ranking?.rating ?? 1000,
    }));
    const bracketMatches = buildBracketMatches(input.competitionId, seededParticipants);

    await tx.insert(schema.competitionMatches).values(bracketMatches);

    await tx
      .update(schema.competitions)
      .set({
        startedAt: new Date(),
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(schema.competitions.id, input.competitionId));

    return buildTournamentActionSuccess("Сетка сформирована.");
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
