// Route handler helpers: authentication + onboarding guards + rate limiting,
// wrapped with centralized error handling.

import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentUser";
import { isProfileComplete } from "@/lib/auth/isProfileComplete";
import { AppError } from "@/lib/utils/errors";
import { handleError } from "@/lib/utils/response";
import { rateLimit } from "@/lib/utils/rateLimit";
import type { Profile } from "@/db/schema";

export interface Ctx {
  profile: Profile;
  userId: string;
}

type Handler = (ctx: Ctx) => Promise<NextResponse> | NextResponse;

// Runs a handler with an authenticated profile (created on first login).
export async function withAuth(
  requestOrFn: Request | Handler,
  maybeFn?: Handler
): Promise<NextResponse> {
  try {
    const request = typeof requestOrFn === "function" ? undefined : requestOrFn;
    const fn = typeof requestOrFn === "function" ? requestOrFn : maybeFn!;
    const profile = await getCurrentProfile(request);
    return await fn({ profile, userId: profile.id });
  } catch (err) {
    return handleError(err);
  }
}

// Runs a handler that additionally requires completed onboarding.
export async function withOnboardedAuth(
  requestOrFn: Request | Handler,
  maybeFn?: Handler
): Promise<NextResponse> {
  try {
    const request = typeof requestOrFn === "function" ? undefined : requestOrFn;
    const fn = typeof requestOrFn === "function" ? requestOrFn : maybeFn!;
    const profile = await getCurrentProfile(request);
    const completion = await isProfileComplete(profile);
    if (!completion.complete) {
      throw new AppError(
        "ONBOARDING_INCOMPLETE",
        "Complete onboarding to access this resource"
      );
    }
    return await fn({ profile, userId: profile.id });
  } catch (err) {
    return handleError(err);
  }
}

// Apply an in-memory rate limit for the given profile + bucket. Throws
// RATE_LIMITED when exceeded.
export function enforceRateLimit(
  userId: string,
  bucket: string,
  limit: number,
  windowMs: number
): void {
  const result = rateLimit(`${bucket}:${userId}`, limit, windowMs);
  if (!result.allowed) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many requests, please slow down."
    );
  }
}
