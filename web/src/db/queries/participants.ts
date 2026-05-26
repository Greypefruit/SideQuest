import "server-only";
import { randomUUID } from "crypto";
import { and, asc, eq } from "drizzle-orm";
import { type DbExecutor } from "../index";
import { activityTypes, participants, profiles } from "../schema";
import {
  activityTypeColumns,
  getDb,
  participantColumns,
  profileColumns,
} from "./shared";

type CreateParticipantInput = Pick<
  typeof participants.$inferInsert,
  "profileId" | "activityTypeId"
> &
  Partial<Pick<typeof participants.$inferInsert, "isActive">>;

export async function getParticipantById(
  participantId: string,
  database?: DbExecutor,
) {
  const [participant] = await getDb(database)
    .select()
    .from(participants)
    .where(eq(participants.id, participantId))
    .limit(1);

  return participant ?? null;
}

export async function getParticipantByProfileAndActivity(
  profileId: string,
  activityTypeId: string,
  database?: DbExecutor,
) {
  const [participant] = await getDb(database)
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.profileId, profileId),
        eq(participants.activityTypeId, activityTypeId),
      ),
    )
    .limit(1);

  return participant ?? null;
}

export async function getParticipantActivityData(
  profileId: string,
  activityTypeId: string,
  database?: DbExecutor,
) {
  const [result] = await getDb(database)
    .select({
      participant: participantColumns,
      profile: profileColumns,
      activityType: activityTypeColumns,
    })
    .from(participants)
    .innerJoin(profiles, eq(participants.profileId, profiles.id))
    .innerJoin(activityTypes, eq(participants.activityTypeId, activityTypes.id))
    .where(
      and(
        eq(participants.profileId, profileId),
        eq(participants.activityTypeId, activityTypeId),
      ),
    )
    .limit(1);

  return result ?? null;
}

export async function createParticipant(
  input: CreateParticipantInput,
  database?: DbExecutor,
) {
  const connection = getDb(database);
  const id = randomUUID();

  await connection.insert(participants).values({
    ...input,
    id,
  });

  const [participant] = await connection
    .select()
    .from(participants)
    .where(eq(participants.id, id))
    .limit(1);

  return participant;
}

export async function ensureParticipantExists(
  input: CreateParticipantInput,
  database?: DbExecutor,
) {
  const connection = getDb(database);

  const existingParticipant = await getParticipantByProfileAndActivity(
    input.profileId,
    input.activityTypeId,
    connection,
  );

  if (existingParticipant) {
    return existingParticipant;
  }

  return createParticipant(input, connection);
}

export async function listActiveParticipantProfilesByActivity(
  activityTypeId: string,
  database?: DbExecutor,
) {
  return getDb(database)
    .select({
      participantId: participants.id,
      profileId: profiles.id,
      displayName: profiles.displayName,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      email: profiles.email,
    })
    .from(participants)
    .innerJoin(profiles, eq(participants.profileId, profiles.id))
    .where(
      and(
        eq(participants.activityTypeId, activityTypeId),
        eq(participants.isActive, true),
        eq(profiles.isActive, true),
      ),
    )
    .orderBy(asc(profiles.lastName), asc(profiles.firstName), asc(profiles.displayName));
}
