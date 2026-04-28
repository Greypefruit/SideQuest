"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentViewer } from "@/src/auth/current-viewer";
import { createCompetition, getDefaultActivityType } from "@/src/db/queries";

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
