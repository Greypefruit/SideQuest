import "server-only";
import { randomUUID } from "node:crypto";
import { type DbExecutor } from "@/src/db";
import {
  ensureParticipantExists,
  ensureProfileExists,
  ensureRankingExists,
  getDefaultActivityType,
  getProfileByEmail,
} from "@/src/db/queries";
import { normalizeAuthEmail } from "./validation";

function buildDisplayName(email: string) {
  const normalizedEmail = normalizeAuthEmail(email);
  const localPart = normalizedEmail.split("@")[0] ?? normalizedEmail;

  return localPart.slice(0, 120);
}

export class AccessDisabledError extends Error {
  constructor() {
    super("ACCESS_DISABLED");
  }
}

export async function provisionRelease1User(
  email: string,
  database: DbExecutor,
) {
  const normalizedEmail = normalizeAuthEmail(email);
  let profile = await getProfileByEmail(normalizedEmail, database);

  if (profile?.isActive === false) {
    throw new AccessDisabledError();
  }

  if (!profile) {
    profile = await ensureProfileExists(
      {
        authUserId: randomUUID(),
        email: normalizedEmail,
        displayName: buildDisplayName(normalizedEmail),
        role: "player",
        isActive: true,
      },
      database,
    );
  }

  if (!profile) {
    throw new Error("Failed to provision profile");
  }

  if (!profile.isActive) {
    throw new AccessDisabledError();
  }

  const defaultActivityType = await getDefaultActivityType(database);

  if (!defaultActivityType) {
    throw new Error("Default activity type is missing");
  }

  const participant = await ensureParticipantExists(
    {
      profileId: profile.id,
      activityTypeId: defaultActivityType.id,
      isActive: true,
    },
    database,
  );

  if (!participant) {
    throw new Error("Failed to provision participant");
  }

  const ranking = await ensureRankingExists(
    {
      participantId: participant.id,
      rating: 1000,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
    },
    database,
  );

  if (!ranking) {
    throw new Error("Failed to provision ranking");
  }

  return {
    profile,
    participant,
    ranking,
    activityType: defaultActivityType,
  };
}
