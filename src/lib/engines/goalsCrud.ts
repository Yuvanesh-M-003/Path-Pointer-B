// Goals CRUD + progress recomputation.
//
// Goal progress is kept consistent with actual tracked activity: for a goal
// spanning [startDate, endDate], progress = tracked solves in that window.

import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { goals, userProblems } from "@/db/schema";
import { toLocalDateString } from "@/lib/utils/dates";
import { AppError } from "@/lib/utils/errors";
import type { Goal } from "@/db/schema";
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validation/goals";

async function trackedSolvesInWindow(
  userId: string,
  start: string,
  end: string | null
): Promise<number> {
  const conds = [
    eq(userProblems.userId, userId),
    gte(userProblems.solvedDate, start),
  ];
  if (end) conds.push(lte(userProblems.solvedDate, end));
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userProblems)
    .where(and(...conds));
  return rows[0]?.count ?? 0;
}

// Return goals with progress recomputed from activity (does not mutate DB on
// read; the numbers are always fresh).
export async function listGoalsWithProgress(userId: string): Promise<Goal[]> {
  const rows = await db.select().from(goals).where(eq(goals.userId, userId));
  const enriched: Goal[] = [];
  for (const g of rows) {
    const progress = await trackedSolvesInWindow(userId, g.startDate, g.endDate);
    enriched.push({
      ...g,
      progress,
      completed: progress >= g.target,
    });
  }
  return enriched;
}

export async function createGoal(
  userId: string,
  input: CreateGoalInput
): Promise<Goal> {
  const start = input.startDate ?? toLocalDateString();
  if (input.endDate && input.endDate < start) {
    throw new AppError("INVALID_INPUT", "endDate must be on/after startDate");
  }
  const rows = await db
    .insert(goals)
    .values({
      userId,
      type: input.type,
      title: input.title,
      target: input.target,
      startDate: start,
      endDate: input.endDate ?? null,
      progress: 0,
      completed: false,
    })
    .returning();
  const g = rows[0];
  const progress = await trackedSolvesInWindow(userId, g.startDate, g.endDate);
  return { ...g, progress, completed: progress >= g.target };
}

export async function updateGoal(
  userId: string,
  goalId: string,
  input: UpdateGoalInput
): Promise<Goal> {
  const existing = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .limit(1);
  if (existing.length === 0) {
    throw new AppError("GOAL_NOT_FOUND", "Goal not found");
  }

  const set: Partial<typeof goals.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) set.title = input.title;
  if (input.target !== undefined) set.target = input.target;
  if (input.progress !== undefined) set.progress = input.progress;
  if (input.completed !== undefined) set.completed = input.completed;
  if (input.endDate !== undefined) set.endDate = input.endDate;

  const rows = await db
    .update(goals)
    .set(set)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .returning();
  const g = rows[0];
  const progress = await trackedSolvesInWindow(userId, g.startDate, g.endDate);
  return { ...g, progress, completed: progress >= g.target };
}
