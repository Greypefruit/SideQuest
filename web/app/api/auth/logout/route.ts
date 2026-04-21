import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
} from "@/src/auth/constants";
import { getExpiredSessionCookieOptions } from "@/src/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    getExpiredSessionCookieOptions(),
  );

  return response;
}
