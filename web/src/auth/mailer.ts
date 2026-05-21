import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { OTP_TTL_MINUTES } from "./constants";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  replyTo?: string;
};

let cachedTransporter: Transporter | null = null;

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function parseSmtpPort(rawValue: string) {
  const port = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a positive integer");
  }

  return port;
}

function parseSmtpSecure(rawValue: string) {
  const normalizedValue = rawValue.trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  throw new Error("SMTP_SECURE must be either 'true' or 'false'");
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = process.env.SMTP_PORT?.trim();
  const secure = process.env.SMTP_SECURE?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.OTP_EMAIL_FROM?.trim();
  const replyTo = process.env.OTP_EMAIL_REPLY_TO?.trim();

  if (!host || !port || !secure || !user || !password || !from) {
    return null;
  }

  return {
    host,
    port: parseSmtpPort(port),
    secure: parseSmtpSecure(secure),
    user,
    password,
    from,
    replyTo: replyTo || undefined,
  };
}

function getTransporter(config: SmtpConfig) {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  return cachedTransporter;
}

function buildTextBody(code: string) {
  return [
    "Здравствуйте!",
    "",
    "Вы запросили код для входа в SideQuest.",
    "",
    `Ваш код: ${code}`,
    `Код действует ${OTP_TTL_MINUTES} минут.`,
    "",
    "Если вы не запрашивали вход, просто проигнорируйте это письмо.",
  ].join("\n");
}

function buildHtmlBody(code: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <p>Здравствуйте!</p>
      <p>Вы запросили код для входа в <strong>SideQuest</strong>.</p>
      <p style="margin: 24px 0;">
        <span style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #eff6ff; border: 1px solid #bfdbfe; font-size: 24px; font-weight: 700; letter-spacing: 0.3em;">
          ${code}
        </span>
      </p>
      <p>Код действует ${OTP_TTL_MINUTES} минут.</p>
      <p>Если вы не запрашивали вход, просто проигнорируйте это письмо.</p>
    </div>
  `;
}

export async function sendOtpEmail(email: string, code: string) {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    if (isDevelopment()) {
      console.info(`[SideQuest OTP][dev fallback] ${email}: ${code}`);
      return;
    }

    throw new Error("SMTP is not configured");
  }

  const transporter = getTransporter(smtpConfig);

  await transporter.sendMail({
    from: smtpConfig.from,
    to: email,
    replyTo: smtpConfig.replyTo,
    subject: "Код входа в SideQuest",
    text: buildTextBody(code),
    html: buildHtmlBody(code),
  });
}
