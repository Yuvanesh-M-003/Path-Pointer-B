import { z } from "zod";
import { difficultySchema } from "./common";

export const problemFiltersSchema = z.object({
  topic: z.string().trim().max(120).optional(), // topic name or slug
  subtopic: z.string().trim().max(120).optional(),
  difficulty: difficultySchema.optional(),
  search: z.string().trim().max(200).optional(),
  status: z.enum(["solved", "unsolved"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["displayOrder", "title", "difficulty"]).default("displayOrder"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type ProblemFilters = z.infer<typeof problemFiltersSchema>;

export const solveProblemSchema = z
  .object({
    notes: z.string().trim().max(2000).optional(),
    // optional IANA timezone so the solve is attributed to the user's local day
    timezone: z.string().trim().max(64).optional(),
  })
  .strict()
  .optional();
