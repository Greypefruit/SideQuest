import "server-only";
import { randomUUID } from "crypto";
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
  const connection = getDb(database);
  const id = randomUUID();

  await connection.insert(authOtpChallenges).values({
    ...input,
    id,
    email: normalizeEmail(input.email),
  });

  const [challenge] = await connection
    .select()
    .from(authOtpChallenges)
    .where(eq(authOtpChallenges.id, id))
    .limit(1);

  return challenge;
}

export async function invalidateActiveOtpChallenges(
  email: string,
  database?: DbExecutor,
) {
  const connection = getDb(database);
  const now = new Date();
  const normalizedEmail = normalizeEmail(email);

  const challenges = await connection
    .select()
    .from(authOtpChallenges)
    .where(
      and(
        eq(authOtpChallenges.email, normalizedEmail),
        isNull(authOtpChallenges.consumedAt),
        isNull(authOtpChallenges.invalidatedAt),
      ),
    );

  await connection
    .update(authOtpChallenges)
    .set({
      invalidatedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(authOtpChallenges.email, normalizedEmail),
        isNull(authOtpChallenges.consumedAt),
        isNull(authOtpChallenges.invalidatedAt),
      ),
    );

  return challenges;
}

export async function consumeOtpChallenge(
  challengeId: string,
  database?: DbExecutor,
) {
  const connection = getDb(database);
  const now = new Date();

  await connection
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
    );

  const [challenge] = await connection
    .select()
    .from(authOtpChallenges)
    .where(eq(authOtpChallenges.id, challengeId))
    .limit(1);

  return challenge?.consumedAt ? challenge : null;
}

export async function markOtpChallengeExpired(
  challengeId: string,
  database?: DbExecutor,
) {
  const connection = getDb(database);
  const now = new Date();

  await connection
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
    );

  const [challenge] = await connection
    .select()
    .from(authOtpChallenges)
    .where(eq(authOtpChallenges.id, challengeId))
    .limit(1);

  return challenge?.invalidatedAt ? challenge : null;
}

export async function invalidateOtpChallenge(
  challengeId: string,
  database?: DbExecutor,
) {
  const connection = getDb(database);
  const now = new Date();

  await connection
    .update(authOtpChallenges)
    .set({
      invalidatedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(authOtpChallenges.id, challengeId),
        isNull(authOtpChallenges.consumedAt),
        isNull(authOtpChallenges.invalidatedAt),
      ),
    );

  const [challenge] = await connection
    .select()
    .from(authOtpChallenges)
    .where(eq(authOtpChallenges.id, challengeId))
    .limit(1);

  return challenge?.invalidatedAt ? challenge : null;
}

export async function registerFailedOtpAttempt(
  challengeId: string,
  nextAttemptsCount: number,
  database?: DbExecutor,
) {
  const connection = getDb(database);
  const now = new Date();

  await connection
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
    );

  const [challenge] = await connection
    .select()
    .from(authOtpChallenges)
    .where(eq(authOtpChallenges.id, challengeId))
    .limit(1);

  return challenge ?? null;
}
