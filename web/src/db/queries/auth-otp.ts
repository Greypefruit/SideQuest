import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { type DbExecutor } from "../index";
import { authOtpChallenges } from "../schema";
import { getDb, normalizeEmail } from "./shared";

type CreateOtpChallengeInput = Pick<
  typeof authOtpChallenges.$inferInsert,
  "email" | "codeHash" | "expiresAt" | "resendAvailableAt"
>;

export async function getLatestOtpChallengeByEmail(
  email: string,
  database?: DbExecutor,
) {
  const [challenge] = await getDb(database)
    .select()
    .from(authOtpChallenges)
    .where(eq(authOtpChallenges.email, normalizeEmail(email)))
    .orderBy(desc(authOtpChallenges.createdAt))
    .limit(1);

  return challenge ?? null;
}

export async function getLatestActiveOtpChallengeByEmail(
  email: string,
  database?: DbExecutor,
) {
  const [challenge] = await getDb(database)
    .select()
    .from(authOtpChallenges)
    .where(
      and(
        eq(authOtpChallenges.email, normalizeEmail(email)),
        isNull(authOtpChallenges.consumedAt),
        isNull(authOtpChallenges.invalidatedAt),
      ),
    )
    .orderBy(desc(authOtpChallenges.createdAt))
    .limit(1);

  return challenge ?? null;
}

export async function createOtpChallenge(
  input: CreateOtpChallengeInput,
  database?: DbExecutor,
) {
  const [challenge] = await getDb(database)
    .insert(authOtpChallenges)
    .values({
      ...input,
      email: normalizeEmail(input.email),
    })
    .returning();

  return challenge;
}

export async function invalidateActiveOtpChallenges(
  email: string,
  database?: DbExecutor,
) {
  const now = new Date();

  return getDb(database)
    .update(authOtpChallenges)
    .set({
      invalidatedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(authOtpChallenges.email, normalizeEmail(email)),
        isNull(authOtpChallenges.consumedAt),
        isNull(authOtpChallenges.invalidatedAt),
      ),
    )
    .returning();
}

export async function consumeOtpChallenge(
  challengeId: string,
  database?: DbExecutor,
) {
  const now = new Date();

  const [challenge] = await getDb(database)
    .update(authOtpChallenges)
    .set({
      consumedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(authOtpChallenges.id, challengeId),
        isNull(authOtpChallenges.consumedAt),
        isNull(authOtpChallenges.invalidatedAt),
      ),
    )
    .returning();

  return challenge ?? null;
}

export async function markOtpChallengeExpired(
  challengeId: string,
  database?: DbExecutor,
) {
  const now = new Date();

  const [challenge] = await getDb(database)
    .update(authOtpChallenges)
    .set({
      invalidatedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(authOtpChallenges.id, challengeId),
        isNull(authOtpChallenges.invalidatedAt),
      ),
    )
    .returning();

  return challenge ?? null;
}

export async function registerFailedOtpAttempt(
  challengeId: string,
  nextAttemptsCount: number,
  database?: DbExecutor,
) {
  const now = new Date();

  const [challenge] = await getDb(database)
    .update(authOtpChallenges)
    .set({
      attemptsCount: nextAttemptsCount,
      invalidatedAt: nextAttemptsCount >= 5 ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(authOtpChallenges.id, challengeId),
        isNull(authOtpChallenges.consumedAt),
      ),
    )
    .returning();

  return challenge ?? null;
}
