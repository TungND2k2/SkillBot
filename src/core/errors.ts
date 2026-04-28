/**
 * Application-level errors. Throw these from anywhere in the codebase —
 * the HTTP layer's error handler catches `AppError` and maps to status + JSON.
 *
 * Code paths that should NOT be caught by the global handler (programmer
 * errors, unexpected DB failures, etc.) should throw plain `Error` instead.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, status = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("validation_error", message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("not_found", `${resource} không tìm thấy`, 404);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Phiên đăng nhập không hợp lệ") {
    super("unauthenticated", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Không có quyền thực hiện thao tác này") {
    super("forbidden", message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("conflict", message, 409);
  }
}
