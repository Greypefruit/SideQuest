import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { type DbExecutor } from "../index";
import { profiles } from "../schema";
import { eqNormalizedEmail, getDb, hasValues, normalizeEmail } from "./shared";

type CreateProfileInput = Pick<
  typeof profiles.$inferInsert,
  "authUserId" | "email" | "displayName"
> &
  Partial<Pick<typeof profiles.$inferInsert, "role" | "isActive">>;

type UpdateProfileInput = Partial<
  Pick<
    typeof profiles.$inferInsert,
    "displayName" | "email" | "firstName" | "lastName" | "role" | "isActive"
  >
>;

export type AdminProfilesListItem = Pick<
  typeof profiles.$inferSelect,
  "id" | "displayName" | "email" | "role" | "isActive"
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

  if (input.firstName !== undefined) {
    patch.firstName = input.firstName === null ? null : input.firstName.trim();
  }

  if (input.lastName !== undefined) {
    patch.lastName = input.lastName === null ? null : input.lastName.trim();
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

export async function listProfilesForAdmin(database?: DbExecutor) {
  return getDb(database)
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      email: profiles.email,
      role: profiles.role,
      isActive: profiles.isActive,
    })
    .from(profiles)
    .orderBy(
      desc(profiles.isActive),
      sql`case
        when ${profiles.role} = 'admin' then 0
        when ${profiles.role} = 'organizer' then 1
        else 2
      end`,
      asc(profiles.displayName),
      asc(profiles.email),
    );
}

export async function countActiveAdminProfiles(database?: DbExecutor) {
  const [result] = await getDb(database)
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(profiles)
    .where(and(eq(profiles.role, "admin"), eq(profiles.isActive, true)));

  return result?.count ?? 0;
}

export async function lockProfileByIdForUpdate(
  profileId: string,
  database: DbExecutor,
) {
  await getDb(database).execute(
    sql`select ${profiles.id} from ${profiles} where ${profiles.id} = ${profileId} for update`,
  );
}

export async function lockActiveAdminProfilesForUpdate(database: DbExecutor) {
  await getDb(database).execute(
    sql`select ${profiles.id}
        from ${profiles}
        where ${profiles.role} = 'admin' and ${profiles.isActive} = true
        for update`,
  );
}
