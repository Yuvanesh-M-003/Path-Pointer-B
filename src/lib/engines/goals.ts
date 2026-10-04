// Daily goal engine.
//
// Dynamic daily goal based on TOTAL solved (baseline + tracked):
//   0–50    -> 2/day
//   51–150  -> 3/day
//   151–300 -> 4/day
//   301–500 -> 5/day
//   500+    -> 6/day

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { getTotalSolved } from "./solvedStats";
import type { Goal } from "@/db/schema";

export function dailyGoalForTotal(totalSolved: number): number {
  if (totalSolved <= 50) return 2;
  if (totalSolved <= 150) return 3;
  if (totalSolved <= 300) return 4;
  if (totalSolved <= 500) return 5;
  return 6;
}

export async function getDailyGoal(userId: string): Promise<number> {
  const total = await getTotalSolved(userId);
  return dailyGoalForTotal(total);
}

// Recompute progress for a user's non-daily goals from tracked activity.
// (Daily goals are handled by the daily_progress engine.)
export async function getUserGoals(userId: string): Promise<Goal[]> {
  return db.select().from(goals).where(eq(goals.userId, userId));
}

export async function getGoalById(
  userId: string,
  goalId: string
): Promise<Goal | null> {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}
