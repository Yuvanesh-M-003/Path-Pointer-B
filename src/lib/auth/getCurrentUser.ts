import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, type Profile } from "@/db/schema";
import { getServerAuthUser } from "@/lib/supabase/server";
import { AppError, unauthorized } from "@/lib/utils/errors";
import type { AuthUser } from "@/lib/types";

// Returns the authenticated Supabase Auth user.
export async function requireAuthUser(request?: Request): Promise<AuthUser> {
  const user = await getServerAuthUser(request);

  if (!user) {
    throw unauthorized();
  }

  return user;
}

// Returns the Path Pointer profile associated with the
// authenticated Supabase user.
//
// auth.users.id
//      ↓
// profiles.auth_user_id
//      ↓
// profiles.id

export async function getCurrentProfile(request?: Request): Promise<Profile> {
  const authUser = await requireAuthUser(request);

  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.authUserId, authUser.authUserId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  if (!authUser.email) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Authenticated user does not have an email"
    );
  }

  // First login: create the application profile.
  const inserted = await db
    .insert(profiles)
    .values({
      authUserId: authUser.authUserId,
      email: authUser.email,
      name: authUser.name ?? authUser.email.split("@")[0],
      avatarUrl: authUser.avatarUrl ?? null,
      onboardingCompleted: false,
    })
    .onConflictDoNothing({
      target: profiles.authUserId,
    })
    .returning();

  if (inserted.length > 0) {
    return inserted[0];
  }

  // Another request may have created the profile simultaneously.
  const reFetched = await db
    .select()
    .from(profiles)
    .where(eq(profiles.authUserId, authUser.authUserId))
    .limit(1);

  if (reFetched.length === 0) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Failed to provision profile"
    );
  }

  return reFetched[0];
}

// Returns the internal Path Pointer user ID.
// This is profiles.id, NOT auth.users.id.
export async function getCurrentUserId(): Promise<string> {
  const profile = await getCurrentProfile();
  return profile.id;
}