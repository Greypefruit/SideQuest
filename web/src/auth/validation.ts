import { OTP_CODE_LENGTH } from "./constants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`);

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(normalizeAuthEmail(email));
}

export function isValidOtpCode(code: string) {
  return OTP_PATTERN.test(code.trim());
}
