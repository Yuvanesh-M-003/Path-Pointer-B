import { z } from "zod";
import { uuidSchema } from "./common";

export const updateRoadmapSchema = z
  .object({
    roadmapSubtopicId: uuidSchema,
    status: z.enum(["not_started", "in_progress", "completed"]).optional(),
    progress: z.coerce.number().min(0).max(100).optional(),
  })
  .strict()
  .refine((v) => v.status !== undefined || v.progress !== undefined, {
    message: "Provide status or progress",
  });

export type UpdateRoadmapInput = z.infer<typeof updateRoadmapSchema>;
