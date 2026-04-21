"use client";

import { useEffect, useMemo, useState } from "react";
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

export function AuthFlow({ initialEmail = "" }: AuthFlowProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!resendAvailableAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
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
  const canResend = step === "code" && secondsLeft === 0 && !isSubmitting;

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
        setError(result.message ?? AUTH_MESSAGES.requestNewCode);

        if (result.retryAfterSeconds) {
          setResendAvailableAt(Date.now() + result.retryAfterSeconds * 1000);
        }

        return;
      }

      setStep("code");
      setCode("");
      setEmail(result.email ?? normalizedEmail);
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
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 sm:p-8">
      {step === "email" ? (
        <form className="space-y-5" onSubmit={handleRequestOtp} noValidate>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-950">Вход в SideQuest</h1>
            <p className="text-sm leading-6 text-slate-600">
              Введите email, на который мы отправим код для входа.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-slate-950"
            />
          </label>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Отправляем..." : "Получить код"}
          </button>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleVerifyOtp}>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-950">
              Подтверждение входа
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              Введите 4-значный код из письма, которое мы отправили на ваш email.
            </p>
            <p className="text-sm text-slate-500">{normalizedEmail}</p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Код подтверждения</span>
            <input
              type="text"
              name="code"
              inputMode="numeric"
              maxLength={OTP_CODE_LENGTH}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D+/g, "").slice(0, OTP_CODE_LENGTH))
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base tracking-[0.3em] text-slate-950 outline-none transition focus:border-slate-950"
            />
          </label>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Проверяем..." : "Войти"}
          </button>

          <div className="text-sm">
            {canResend ? (
              <button
                type="button"
                onClick={() => {
                  void handleRequestOtp({
                    preventDefault() {},
                  } as React.FormEvent<HTMLFormElement>);
                }}
                className="font-medium text-slate-900 underline underline-offset-4"
              >
                Отправить код повторно
              </button>
            ) : (
              <p className="text-slate-500">
                Отправить код повторно можно через {secondsLeft} сек.
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
