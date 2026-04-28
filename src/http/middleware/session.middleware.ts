import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { UnauthenticatedError } from "../../core/errors.js";
import { WebSessionService } from "../../domain/web-session/web-session.service.js";
import type { AppEnv } from "../app-context.js";

/**
 * Singleton service injected by the wiring layer at boot. Avoids forcing
 * every middleware import to receive the service via factory.
 *
 * Callers MUST invoke `setSessionService()` once before the first request,
 * otherwise `requireSession` throws.
 */
let sessionService: WebSessionService | null = null;

export function setSessionService(svc: WebSessionService): void {
  sessionService = svc;
}

/**
 * Reject the request with 401 if there is no valid session cookie.
 * Otherwise attach the `WebSession` entity to Hono context.
 */
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!sessionService) {
    throw new Error("session middleware used before setSessionService() — wiring bug");
  }
  const token = getCookie(c, WebSessionService.cookieName);
  if (!token) throw new UnauthenticatedError();
  const session = await sessionService.findActive(token);
  if (!session) throw new UnauthenticatedError("Phiên đăng nhập đã hết hạn");
  c.set("session", session);
  return next();
};
