// Reusable "is this user allowed on the dashboard?" logic.
//
// Dashboard is accessible only when:
//   profile exists
//   AND baseline exists
//   AND all required topic ratings exist
//   AND onboarding_completed = true

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  profiles,
  topics,
  userSolvedBaseline,
  userTopicRatings,
  type Profile,
} from "@/db/schema";

export interface ProfileCompletion {
  complete: boolean;
  hasProfile: boolean;
  hasBaseline: boolean;
  hasAllRatings: boolean;
  onboardingCompleted: boolean;
  requiredTopics: number;
  ratedTopics: number;
}

export async function isProfileComplete(
  profile: Profile
): Promise<ProfileCompletion> {
  const [baselineRows, ratingCountRows, topicCountRows] = await Promise.all([
    db
      .select({ id: userSolvedBaseline.id })
      .from(userSolvedBaseline)
      .where(eq(userSolvedBaseline.userId, profile.id))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userTopicRatings)
      .where(eq(userTopicRatings.userId, profile.id)),
    db.select({ count: sql<number>`count(*)::int` }).from(topics),
  ]);

  const requiredTopics = topicCountRows[0]?.count ?? 0;
  const ratedTopics = ratingCountRows[0]?.count ?? 0;
  const hasProfile = true;
  const hasBaseline = baselineRows.length > 0;
  // All required topics must be rated (guard against 0 topics = not complete).
  const hasAllRatings = requiredTopics > 0 && ratedTopics >= requiredTopics;
  const onboardingCompleted = profile.onboardingCompleted;

  return {
    complete: hasProfile && hasBaseline && hasAllRatings && onboardingCompleted,
    hasProfile,
    hasBaseline,
    hasAllRatings,
    onboardingCompleted,
    requiredTopics,
    ratedTopics,
  };
}

// Fetch a profile by auth user id (helper used in tests/tools).
export async function getProfileByAuthId(
  authUserId: string
): Promise<Profile | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.authUserId, authUserId))
    .limit(1);
  return rows[0] ?? null;
}
