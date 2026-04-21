import "server-only";
import { eq } from "drizzle-orm";
import { type DbExecutor } from "../index";
import { profiles } from "../schema";
import { eqNormalizedEmail, getDb, hasValues, normalizeEmail } from "./shared";

type CreateProfileInput = Pick<
  typeof profiles.$inferInsert,
  "authUserId" | "email" | "displayName"
> &
  Partial<Pick<typeof profiles.$inferInsert, "role" | "isActive">>;

type UpdateProfileInput = Partial<
  Pick<typeof profiles.$inferInsert, "displayName" | "email" | "role" | "isActive">
>;

export async function getProfileById(profileId: string, database?: DbExecutor) {
  const [profile] = await getDb(database)
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  return profile ?? null;
}

export async function getProfileByEmail(email: string, database?: DbExecutor) {
  const [profile] = await getDb(database)
    .select()
    .from(profiles)
    .where(eqNormalizedEmail(profiles.email, email))
    .limit(1);

  return profile ?? null;
}

export async function getProfileByAuthUserId(
  authUserId: string,
  database?: DbExecutor,
) {
  const [profile] = await getDb(database)
    .select()
    .from(profiles)
    .where(eq(profiles.authUserId, authUserId))
    .limit(1);

  return profile ?? null;
}

export async function createProfile(
  input: CreateProfileInput,
  database?: DbExecutor,
) {
  const [profile] = await getDb(database)
    .insert(profiles)
    .values({
      ...input,
      email: normalizeEmail(input.email),
      displayName: input.displayName.trim(),
    })
    .returning();

  return profile;
}

export async function ensureProfileExists(
  input: CreateProfileInput,
  database?: DbExecutor,
) {
  const connection = getDb(database);

  const [createdProfile] = await connection
    .insert(profiles)
    .values({
      ...input,
      email: normalizeEmail(input.email),
      displayName: input.displayName.trim(),
    })
    .onConflictDoNothing({ target: profiles.email })
    .returning();

  if (createdProfile) {
    return createdProfile;
  }

  return getProfileByEmail(input.email, connection);
}

export async function updateProfile(
  profileId: string,
  input: UpdateProfileInput,
  database?: DbExecutor,
) {
  const patch: UpdateProfileInput & { updatedAt?: Date } = {};

  if (input.displayName !== undefined) {
    patch.displayName = input.displayName.trim();
  }

  if (input.email !== undefined) {
    patch.email = normalizeEmail(input.email);
  }

  if (input.role !== undefined) {
    patch.role = input.role;
  }

  if (input.isActive !== undefined) {
    patch.isActive = input.isActive;
  }

  if (!hasValues(patch)) {
    return getProfileById(profileId, database);
  }

  patch.updatedAt = new Date();

  const [profile] = await getDb(database)
    .update(profiles)
    .set(patch)
    .where(eq(profiles.id, profileId))
    .returning();

  return profile ?? null;
}

export async function getProfileIsActive(
  profileId: string,
  database?: DbExecutor,
) {
  const profile = await getProfileById(profileId, database);

  return profile?.isActive ?? null;
}

export async function getProfileRole(profileId: string, database?: DbExecutor) {
  const profile = await getProfileById(profileId, database);

  return profile?.role ?? null;
}
