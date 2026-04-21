"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AUTH_MESSAGES } from "@/src/auth/messages";
import {
  OTP_CODE_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "@/src/auth/constants";
import { isValidEmail, isValidOtpCode, normalizeAuthEmail } from "@/src/auth/validation";

type RequestOtpResponse = {
  ok: boolean;
  email?: string;
  message?: string;
  retryAfterSeconds?: number;
};

type VerifyOtpResponse = {
  ok: boolean;
  redirectTo?: string;
  message?: string;
};

type AuthFlowProps = {
  initialEmail?: string;
};

function getRequestOtpErrorMessage(result: RequestOtpResponse) {
  if (typeof result.retryAfterSeconds === "number" && result.retryAfterSeconds > 0) {
    return `Повторная отправка доступна через ${result.retryAfterSeconds} сек.`;
  }

  return "Новый код можно запросить немного позже";
}

export function AuthFlow({ initialEmail = "" }: AuthFlowProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!resendAvailableAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextTime = Date.now();
      setCurrentTime(nextTime);

      if (nextTime >= resendAvailableAt) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [resendAvailableAt]);

  const normalizedEmail = useMemo(() => normalizeAuthEmail(email), [email]);
  const secondsLeft = useMemo(() => {
    if (!resendAvailableAt) {
      return 0;
    }

    return Math.max(0, Math.ceil((resendAvailableAt - currentTime) / 1000));
  }, [currentTime, resendAvailableAt]);
  const requestOtpCooldownMessage = useMemo(() => {
    if (secondsLeft <= 0) {
      return null;
    }

    return `Повторная отправка доступна через ${secondsLeft} сек.`;
  }, [secondsLeft]);
  const canResend = step === "code" && secondsLeft === 0 && !isSubmitting;
  const isEmailStep = step === "email";
  const isRequestOtpCooldownActive = isEmailStep && secondsLeft > 0;
  const visibleEmailError = isEmailStep && requestOtpCooldownMessage ? requestOtpCooldownMessage : error;
  const shouldHighlightEmailError = isEmailStep && visibleEmailError === AUTH_MESSAGES.invalidEmail;
  const shouldHighlightCodeError = !isEmailStep && error !== null;

  function focusOtpInput(index: number) {
    otpInputRefs.current[index]?.focus();
  }

  function handleOtpInputChange(index: number, nextValue: string) {
    const digits = nextValue.replace(/\D+/g, "");

    if (digits.length === 0) {
      setCode((currentCode) => {
        const nextCode = currentCode.split("");
        nextCode[index] = "";

        return nextCode.join("").slice(0, OTP_CODE_LENGTH);
      });
      setError(null);
      return;
    }

    setCode((currentCode) => {
      const nextCode = currentCode.split("");

      for (let digitOffset = 0; digitOffset < digits.length; digitOffset += 1) {
        const targetIndex = index + digitOffset;

        if (targetIndex >= OTP_CODE_LENGTH) {
          break;
        }

        nextCode[targetIndex] = digits[digitOffset] ?? "";
      }

      return nextCode.join("").slice(0, OTP_CODE_LENGTH);
    });
    setError(null);

    const nextFocusIndex = Math.min(index + digits.length, OTP_CODE_LENGTH - 1);
    focusOtpInput(nextFocusIndex);
  }

  function handleOtpKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      focusOtpInput(index - 1);
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusOtpInput(index - 1);
    }

    if (event.key === "ArrowRight" && index < OTP_CODE_LENGTH - 1) {
      event.preventDefault();
      focusOtpInput(index + 1);
    }
  }

  async function handleRequestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError(AUTH_MESSAGES.invalidEmail);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result = (await response.json()) as RequestOtpResponse;

      if (!response.ok || !result.ok) {
        if (result.retryAfterSeconds) {
          setResendAvailableAt(Date.now() + result.retryAfterSeconds * 1000);
        }

        setError(
          response.status === 429
            ? (result.retryAfterSeconds ? null : getRequestOtpErrorMessage(result))
            : (result.message ?? AUTH_MESSAGES.requestNewCode),
        );

        return;
      }

      setStep("code");
      setCode("");
      setEmail(result.email ?? normalizedEmail);
      setError(null);
      setResendAvailableAt(
        Date.now() + (result.retryAfterSeconds ?? OTP_RESEND_COOLDOWN_SECONDS) * 1000,
      );
    } catch {
      setError(AUTH_MESSAGES.requestNewCode);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidOtpCode(code)) {
      setError(code.trim().length === 0 ? AUTH_MESSAGES.emptyCode : AUTH_MESSAGES.invalidCode);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, code: code.trim() }),
      });
      const result = (await response.json()) as VerifyOtpResponse;

      if (!response.ok || !result.ok) {
        setError(result.message ?? AUTH_MESSAGES.invalidCode);
        return;
      }

      window.location.assign(result.redirectTo ?? "/");
    } catch {
      setError(AUTH_MESSAGES.invalidCode);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className={`w-full max-w-[24rem] rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${
        isEmailStep ? "p-6 sm:p-8" : "p-5 sm:p-7"
      }`}
    >
      {isEmailStep ? (
        <form
          className="mx-auto w-full max-w-[18.5rem] space-y-5 sm:space-y-6"
          onSubmit={handleRequestOtp}
          noValidate
        >
          <div className="space-y-2 text-center">
            <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-950">
              Вход
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              Введите email, на который мы отправим код для входа.
            </p>
          </div>

          <label className="block space-y-2.5">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              aria-invalid={shouldHighlightEmailError}
              className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 ${
                shouldHighlightEmailError
                  ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                  : "border-slate-200"
              }`}
            />
          </label>

          {visibleEmailError ? (
            <p className="text-sm text-rose-600" role="alert">
              {visibleEmailError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || isRequestOtpCooldownActive}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? "Отправляем..." : "Получить код"}
          </button>
        </form>
      ) : (
        <form
          className="mx-auto w-full max-w-[18.5rem] space-y-4"
          onSubmit={handleVerifyOtp}
          noValidate
        >
          <div className="space-y-1.5 text-center">
            <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-950">
              Подтверждение входа
            </h1>
            <p className="text-sm leading-5 text-slate-600">
              Введите 4-значный код из письма, которое мы отправили на ваш email.
            </p>
            <p className="text-sm text-slate-500">{normalizedEmail}</p>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">
              Код подтверждения
            </span>
            <div className="flex items-center justify-center gap-2.5 sm:gap-3">
              {Array.from({ length: OTP_CODE_LENGTH }, (_, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    otpInputRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`Цифра ${index + 1} кода подтверждения`}
                  maxLength={OTP_CODE_LENGTH}
                  value={code[index] ?? ""}
                  onChange={(event) => handleOtpInputChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(event, index)}
                  className={`h-[3.25rem] w-[3.25rem] rounded-[18px] border bg-white text-center text-xl font-semibold text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 sm:h-14 sm:w-14 ${
                    shouldHighlightCodeError
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                      : "border-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {error ? (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? "Проверяем..." : "Войти"}
          </button>

          <div className="space-y-1.5 text-center text-sm">
            <button
              type="button"
              disabled={!canResend}
              onClick={() => {
                void handleRequestOtp({
                  preventDefault() {},
                } as React.FormEvent<HTMLFormElement>);
              }}
              className="font-medium text-blue-600 transition hover:text-blue-500 disabled:text-slate-400"
            >
              Отправить код повторно
            </button>
            <p className="text-slate-500">
              {canResend
                ? "Можно запросить новый код."
                : `Повторная отправка через ${String(secondsLeft).padStart(2, "0")} сек.`}
            </p>
          </div>
        </form>
      )}
    </section>
  );
}
