import { NextResponse } from "next/server";
import {
  createOtpChallenge,
  getLatestOtpChallengeByEmail,
  invalidateActiveOtpChallenges,
} from "@/src/db/queries";
import { db } from "@/src/db";
import { sendOtpEmail } from "@/src/auth/mailer";
import { AUTH_MESSAGES } from "@/src/auth/messages";
import {
  OTP_RESEND_COOLDOWN_MS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_MS,
} from "@/src/auth/constants";
import { generateOtpCode, hashOtpCode } from "@/src/auth/otp";
import { isValidEmail, normalizeAuthEmail } from "@/src/auth/validation";

export const runtime = "nodejs";

type RequestBody = {
  email?: string;
};

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: AUTH_MESSAGES.invalidEmail },
      { status: 400 },
    );
  }

  const normalizedEmail = normalizeAuthEmail(body.email ?? "");

  if (!isValidEmail(normalizedEmail)) {
    return NextResponse.json(
      { ok: false, message: AUTH_MESSAGES.invalidEmail },
      { status: 400 },
    );
  }

  const now = new Date();
  const latestChallenge = await getLatestOtpChallengeByEmail(normalizedEmail);

  if (latestChallenge && latestChallenge.resendAvailableAt > now) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((latestChallenge.resendAvailableAt.getTime() - now.getTime()) / 1000),
    );

    return NextResponse.json(
      {
        ok: false,
        message: AUTH_MESSAGES.requestNewCode,
        retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const code = generateOtpCode();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  const resendAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);

  await db.transaction(async (tx) => {
    await invalidateActiveOtpChallenges(normalizedEmail, tx);
    await createOtpChallenge(
      {
        email: normalizedEmail,
        codeHash: hashOtpCode(normalizedEmail, code),
        expiresAt,
        resendAvailableAt,
      },
      tx,
    );
  });

  await sendOtpEmail(normalizedEmail, code);

  return NextResponse.json({
    ok: true,
    email: normalizedEmail,
    retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
  });
}
