import { z } from "zod";
import { dateStringSchema } from "./common";

export const createGoalSchema = z
  .object({
    type: z.enum(["daily", "weekly", "custom"]).default("custom"),
    title: z.string().trim().min(1).max(160),
    target: z.coerce.number().int().min(1).max(10000),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.nullable().optional(),
  })
  .strict();

export const updateGoalSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    target: z.coerce.number().int().min(1).max(10000).optional(),
    progress: z.coerce.number().int().min(0).max(100000).optional(),
    completed: z.boolean().optional(),
    endDate: dateStringSchema.nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
