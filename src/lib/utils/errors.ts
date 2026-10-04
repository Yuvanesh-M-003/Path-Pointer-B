// Centralized error handling for the Path Pointer backend.
//
// AppError carries a stable application error code + HTTP status. Route handlers
// catch these and convert them to consistent JSON responses. Raw DB errors are
// never leaked to the client.

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PROFILE_NOT_FOUND"
  | "ONBOARDING_INCOMPLETE"
  | "INVALID_INPUT"
  | "PROBLEM_NOT_FOUND"
  | "ALREADY_SOLVED"
  | "TOPIC_NOT_FOUND"
  | "GOAL_NOT_FOUND"
  | "NOTIFICATION_NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  PROFILE_NOT_FOUND: 404,
  ONBOARDING_INCOMPLETE: 403,
  INVALID_INPUT: 422,
  PROBLEM_NOT_FOUND: 404,
  ALREADY_SOLVED: 409,
  TOPIC_NOT_FOUND: 404,
  GOAL_NOT_FOUND: 404,
  NOTIFICATION_NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  code: AppErrorCode;
  status: number;
  details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export function unauthorized(message = "Authentication required") {
  return new AppError("UNAUTHORIZED", message);
}

export function notFound(code: AppErrorCode, message: string) {
  return new AppError(code, message);
}

export function invalidInput(message = "Invalid input", details?: unknown) {
  return new AppError("INVALID_INPUT", message, details);
}
