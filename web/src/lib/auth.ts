/**
 * Web-side session cookie helpers.
 *
 * The cookie value is the session token issued by the bot's `/api/auth/login`.
 * The bot validates it on every request via the `Cookie` header.
 *
 * This module never talks to the database directly — it only reads/writes
 * the cookie and delegates user/tenant hydration to `api.me()`.
 */
import { cookies } from "next/headers";
import { api, ApiError } from "./api";
import type { MeDto } from "@shared/dto";

const COOKIE_NAME = "skillbot_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function hasSessionCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar.has(COOKIE_NAME);
}

/**
 * Fetch current user via the bot API. Returns null if there's no valid
 * session (cookie missing or rejected by bot).
 *
 * Pages that require login should call this and `redirect("/login")` on null.
 */
export async function getCurrentUser(): Promise<MeDto | null> {
  if (!(await hasSessionCookie())) return null;
  try {
    return await api.me();
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthenticated) {
      // Stale cookie — clear it so the next request starts fresh.
      await clearSessionCookie();
      return null;
    }
    throw err;
  }
}
