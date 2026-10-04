import { z } from "zod";
import { uuidSchema } from "./common";

const solvedCount = z.coerce.number().int().min(0).max(100000);

export const topicRatingSchema = z.object({
  topicId: uuidSchema,
  rating: z.coerce.number().int().min(0).max(10),
});

export const onboardingSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    leetcodeUsername: z.string().trim().min(1).max(64).nullable().optional(),
    easySolved: solvedCount,
    mediumSolved: solvedCount,
    hardSolved: solvedCount,
    topicRatings: z
      .array(topicRatingSchema)
      .min(1, "At least one topic rating is required"),
  })
  .strict();

export type OnboardingInput = z.infer<typeof onboardingSchema>;
