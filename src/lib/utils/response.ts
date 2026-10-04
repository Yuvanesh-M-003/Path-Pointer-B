// Consistent JSON response helpers.

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

export interface SuccessBody<T> {
  success: true;
  data: T;
}

export interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function camelToSnake(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

export function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function deserializeFromClient<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deserializeFromClient(item)) as T;
  }

  if (value && typeof value === "object") {
    const deserialized = Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, nestedValue]) => {
        acc[snakeToCamel(key)] = deserializeFromClient(nestedValue);
        return acc;
      },
      {} as Record<string, unknown>
    );
    return deserialized as T;
  }

  return value;
}

export function serializeForClient<T>(value: T): T {
  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForClient(item)) as T;
  }

  if (value && typeof value === "object") {
    const serialized = Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, nestedValue]) => {
        acc[camelToSnake(key)] = serializeForClient(nestedValue);
        return acc;
      },
      {} as Record<string, unknown>
    );
    return serialized as T;
  }

  return value;
}

export function ok<T>(data: T, status = 200): NextResponse<SuccessBody<T>> {
  return NextResponse.json(
    { success: true, data: serializeForClient(data) },
    { status }
  );
}

export function created<T>(data: T): NextResponse<SuccessBody<T>> {
  return ok(data, 201);
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ErrorBody> {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status }
  );
}

// Convert any thrown value into a safe JSON response.
export function handleError(err: unknown): NextResponse<ErrorBody> {
  if (err instanceof AppError) {
    return errorResponse(err.code, err.message, err.status, err.details);
  }

  if (err instanceof ZodError) {
    return errorResponse(
      "INVALID_INPUT",
      "Validation failed",
      422,
      err.flatten()
    );
  }

  // Log server-side details without leaking to the client.
  console.error("[path-pointer] Unhandled error:", err);
  return errorResponse(
    "INTERNAL_ERROR",
    "An unexpected error occurred",
    500
  );
}
