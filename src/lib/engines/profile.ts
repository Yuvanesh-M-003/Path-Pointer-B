// Profile read/update engine.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  profiles,
  userSolvedBaseline,
  userTopicRatings,
  topics,
  type Profile,
} from "@/db/schema";
import { isProfileComplete } from "@/lib/auth/isProfileComplete";
import type { UpdateProfileInput } from "@/lib/validation/profile";

export interface ProfileView {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  leetcodeUsername: string | null;
  onboardingCompleted: boolean;
  profileComplete: boolean;
  baseline: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
  } | null;
  topicRatings: { topicId: string; topic: string; rating: number }[];
}

export async function getProfileView(profile: Profile): Promise<ProfileView> {
  const [baselineRows, ratingRows, completion] = await Promise.all([
    db
      .select()
      .from(userSolvedBaseline)
      .where(eq(userSolvedBaseline.userId, profile.id))
      .limit(1),
    db
      .select({
        topicId: userTopicRatings.topicId,
        topic: topics.name,
        rating: userTopicRatings.rating,
      })
      .from(userTopicRatings)
      .innerJoin(topics, eq(userTopicRatings.topicId, topics.id))
      .where(eq(userTopicRatings.userId, profile.id))
      .orderBy(topics.displayOrder),
    isProfileComplete(profile),
  ]);

  const b = baselineRows[0];

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
    leetcodeUsername: profile.leetcodeUsername,
    onboardingCompleted: profile.onboardingCompleted,
    profileComplete: completion.complete,
    baseline: b
      ? {
          easy: b.easySolved,
          medium: b.mediumSolved,
          hard: b.hardSolved,
          total: b.easySolved + b.mediumSolved + b.hardSolved,
        }
      : null,
    topicRatings: ratingRows,
  };
}

export async function updateProfile(
  profile: Profile,
  input: UpdateProfileInput
): Promise<Profile> {
  const set: Partial<typeof profiles.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = input.name;
  if (input.avatarUrl !== undefined) set.avatarUrl = input.avatarUrl;
  if (input.leetcodeUsername !== undefined)
    set.leetcodeUsername = input.leetcodeUsername;

  const rows = await db
    .update(profiles)
    .set(set)
    .where(eq(profiles.id, profile.id))
    .returning();
  return rows[0];
}
