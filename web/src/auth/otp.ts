import "server-only";
import { createHash, randomInt } from "node:crypto";
import { OTP_CODE_LENGTH } from "./constants";

export function generateOtpCode() {
  const max = 10 ** OTP_CODE_LENGTH;

  return randomInt(0, max).toString().padStart(OTP_CODE_LENGTH, "0");
}

export function hashOtpCode(email: string, code: string) {
  return createHash("sha256")
    .update(`${email}:${code}`)
    .digest("hex");
}
