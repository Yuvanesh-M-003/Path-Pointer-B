import { z } from "zod";

// PATCH /api/profile — only user-editable fields are allowed. Internal fields
// (id, auth_user_id, email, onboarding_completed) are intentionally excluded.
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    avatarUrl: z.string().url().max(2048).nullable().optional(),
    leetcodeUsername: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .nullable()
      .optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
