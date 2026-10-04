import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid identifier");

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const difficultySchema = z.enum(["Easy", "Medium", "Hard"]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .optional();
