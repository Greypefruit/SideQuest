import "server-only";
import { and, eq } from "drizzle-orm";
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
  const [participant] = await getDb(database)
    .insert(participants)
    .values(input)
    .returning();

  return participant;
}

export async function ensureParticipantExists(
  input: CreateParticipantInput,
  database?: DbExecutor,
) {
  const connection = getDb(database);

  const [createdParticipant] = await connection
    .insert(participants)
    .values(input)
    .onConflictDoNothing({
      target: [participants.profileId, participants.activityTypeId],
    })
    .returning();

  if (createdParticipant) {
    return createdParticipant;
  }

  return getParticipantByProfileAndActivity(
    input.profileId,
    input.activityTypeId,
    connection,
  );
}
