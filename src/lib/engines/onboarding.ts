// Onboarding engine.
//
// Safely repeatable (idempotent): all writes use upsert / onConflict so running
// onboarding twice never duplicates profiles, baselines, ratings, mastery, or
// roadmap progress rows.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  profiles,
  topics,
  userSolvedBaseline,
  userTopicRatings,
  type Profile,
} from "@/db/schema";
import { AppError } from "@/lib/utils/errors";
import { initializeTopicMastery } from "./mastery";
import { initializeRoadmapProgress } from "./roadmap";
import type { OnboardingInput } from "@/lib/validation/onboarding";

export async function runOnboarding(
  profile: Profile,
  input: OnboardingInput
): Promise<Profile> {
  // Validate that all required topics are rated and topic ids are real.
  const allTopics = await db.select({ id: topics.id }).from(topics);
  const validTopicIds = new Set(allTopics.map((t) => t.id));

  // Every provided rating must reference a real topic.
  for (const r of input.topicRatings) {
    if (!validTopicIds.has(r.topicId)) {
      throw new AppError("TOPIC_NOT_FOUND", `Unknown topic: ${r.topicId}`);
    }
  }

  // De-duplicate ratings (last one wins) and ensure all required topics rated.
  const ratingMap = new Map<string, number>();
  for (const r of input.topicRatings) ratingMap.set(r.topicId, r.rating);

  const missing = allTopics.filter((t) => !ratingMap.has(t.id));
  if (missing.length > 0) {
    throw new AppError(
      "INVALID_INPUT",
      `All ${allTopics.length} topics must be rated (${missing.length} missing)`
    );
  }

  // Perform all writes atomically.
  const updatedProfile = await db.transaction(async (tx) => {
    // Update profile fields + mark onboarding complete.
    const profRows = await tx
      .update(profiles)
      .set({
        name: input.fullName,
        leetcodeUsername: input.leetcodeUsername ?? null,
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profile.id))
      .returning();

    // Upsert baseline (unique on user_id).
    await tx
      .insert(userSolvedBaseline)
      .values({
        userId: profile.id,
        easySolved: input.easySolved,
        mediumSolved: input.mediumSolved,
        hardSolved: input.hardSolved,
      })
      .onConflictDoUpdate({
        target: userSolvedBaseline.userId,
        set: {
          easySolved: input.easySolved,
          mediumSolved: input.mediumSolved,
          hardSolved: input.hardSolved,
          updatedAt: new Date(),
        },
      });

    // Upsert topic ratings (unique on user_id + topic_id).
    const ratingValues = Array.from(ratingMap.entries()).map(
      ([topicId, rating]) => ({ userId: profile.id, topicId, rating })
    );
    if (ratingValues.length > 0) {
      // Batch upsert: delete existing then insert is simpler & atomic here.
      await tx
        .delete(userTopicRatings)
        .where(eq(userTopicRatings.userId, profile.id));
      await tx.insert(userTopicRatings).values(ratingValues);
    }

    return profRows[0];
  });

  // Initialize mastery + roadmap progress (idempotent upserts).
  await initializeTopicMastery(profile.id);
  await initializeRoadmapProgress(profile.id);

  return updatedProfile;
}


