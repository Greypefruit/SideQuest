import { NextResponse } from "next/server";
import { db } from "@/src/db";
import {
  consumeOtpChallenge,
  getLatestOtpChallengeByEmail,
  markOtpChallengeExpired,
  registerFailedOtpAttempt,
} from "@/src/db/queries";
import { OTP_MAX_ATTEMPTS } from "@/src/auth/constants";
import { AUTH_MESSAGES } from "@/src/auth/messages";
import { hashOtpCode } from "@/src/auth/otp";
import {
  createSessionValue,
  getSessionCookieOptions,
} from "@/src/auth/session";
import { AccessDisabledError, provisionRelease1User } from "@/src/auth/provision-user";
import { isValidEmail, isValidOtpCode, normalizeAuthEmail } from "@/src/auth/validation";

export const runtime = "nodejs";

type RequestBody = {
  email?: string;
  code?: string;
};

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: AUTH_MESSAGES.invalidCode },
      { status: 400 },
    );
  }

  const normalizedEmail = normalizeAuthEmail(body.email ?? "");
  const normalizedCode = (body.code ?? "").trim();

  if (!isValidEmail(normalizedEmail)) {
    return NextResponse.json(
      { ok: false, message: AUTH_MESSAGES.invalidEmail },
      { status: 400 },
    );
  }

  if (normalizedCode.length === 0) {
    return NextResponse.json(
      { ok: false, message: AUTH_MESSAGES.emptyCode },
      { status: 400 },
    );
  }

  if (!isValidOtpCode(normalizedCode)) {
    return NextResponse.json(
      { ok: false, message: AUTH_MESSAGES.invalidCode },
      { status: 400 },
    );
  }

  const now = new Date();
  const latestChallenge = await getLatestOtpChallengeByEmail(normalizedEmail);

  if (!latestChallenge || latestChallenge.consumedAt || latestChallenge.invalidatedAt) {
    return NextResponse.json(
      { ok: false, message: AUTH_MESSAGES.requestNewCode },
      { status: 400 },
    );
  }

  if (latestChallenge.expiresAt <= now) {
    await markOtpChallengeExpired(latestChallenge.id);

    return NextResponse.json(
      { ok: false, message: AUTH_MESSAGES.expiredCode },
      { status: 400 },
    );
  }

  if (latestChallenge.attemptsCount >= OTP_MAX_ATTEMPTS) {
    await markOtpChallengeExpired(latestChallenge.id);

    return NextResponse.json(
      { ok: false, message: AUTH_MESSAGES.tooManyAttempts },
      { status: 400 },
    );
  }

  const submittedCodeHash = hashOtpCode(normalizedEmail, normalizedCode);

  if (submittedCodeHash !== latestChallenge.codeHash) {
    const nextAttemptsCount = latestChallenge.attemptsCount + 1;

    await registerFailedOtpAttempt(latestChallenge.id, nextAttemptsCount);

    return NextResponse.json(
      {
        ok: false,
        message:
          nextAttemptsCount >= OTP_MAX_ATTEMPTS
            ? AUTH_MESSAGES.tooManyAttempts
            : AUTH_MESSAGES.invalidCode,
      },
      { status: 400 },
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      const provisioned = await provisionRelease1User(normalizedEmail, tx);
      const consumedChallenge = await consumeOtpChallenge(latestChallenge.id, tx);

      if (!consumedChallenge) {
        throw new Error("OTP challenge was already consumed");
      }

      return provisioned;
    });

    const response = NextResponse.json({
      ok: true,
      redirectTo: "/",
    });

    response.cookies.set(
      "sidequest_session",
      createSessionValue({
        profileId: result.profile.id,
        authUserId: result.profile.authUserId,
        email: result.profile.email,
        role: result.profile.role,
      }),
      getSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    if (error instanceof AccessDisabledError) {
      return NextResponse.json(
        { ok: false, message: AUTH_MESSAGES.accessDisabled },
        { status: 403 },
      );
    }

    throw error;
  }
}
