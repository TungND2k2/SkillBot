import type { ErrorHandler } from "hono";
import { AppError } from "./errors.js";
import { logger } from "../utils/logger.js";

/**
 * Global Hono error handler. Catches `AppError` thrown anywhere in the
 * request pipeline and maps to a typed JSON response with the proper status.
 *
 * Unknown errors get logged at error level and return a generic 500 — never
 * leak internal messages to the client.
 */
export const httpErrorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json(
      {
        ok: false as const,
        error: { code: err.code, message: err.message, details: err.details },
      },
      err.status as 400 | 401 | 403 | 404 | 409 | 500,
    );
  }
  logger.error("HTTP", `Unhandled error in ${c.req.method} ${c.req.path}: ${err.message}`, err);
  return c.json(
    { ok: false as const, error: { code: "internal_error", message: "Lỗi hệ thống" } },
    500,
  );
};
