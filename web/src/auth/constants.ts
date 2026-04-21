export const OTP_CODE_LENGTH = 4;
export const OTP_TTL_MINUTES = 10;
export const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
export const OTP_RESEND_COOLDOWN_SECONDS = 30;
export const OTP_RESEND_COOLDOWN_MS = OTP_RESEND_COOLDOWN_SECONDS * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export const SESSION_COOKIE_NAME = "sidequest_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
