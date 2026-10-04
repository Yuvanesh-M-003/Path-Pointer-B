// Daily progress engine.
//
// A daily_progress row tracks how many problems the user solved on a given
// local calendar day, the current daily goal, and whether the goal was met.

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { dailyProgress } from "@/db/schema";
import { toLocalDateString } from "@/lib/utils/dates";
import { getDailyGoal } from "./goals";
import type { DailyProgress } from "@/db/schema";
import type { DailyProgressView } from "@/lib/types";

export function toView(row: DailyProgress): DailyProgressView {
  return {
    date: row.progressDate,
    solvedCount: row.solvedCount,
    dailyGoal: row.dailyGoal,
    completed: row.completed,
    remaining: Math.max(0, row.dailyGoal - row.solvedCount),
  };
}

// Read daily progress for a date. If no row exists, returns a synthesized view
// with the current dynamic goal (no write side-effect on read).
export async function getDailyProgress(
  userId: string,
  date: string,
  timezone?: string
): Promise<DailyProgressView> {
  const targetDate = date ?? toLocalDateString(new Date(), timezone);
  const rows = await db
    .select()
    .from(dailyProgress)
    .where(
      and(
        eq(dailyProgress.userId, userId),
        eq(dailyProgress.progressDate, targetDate)
      )
    )
    .limit(1);

  if (rows.length > 0) return toView(rows[0]);

  const goal = await getDailyGoal(userId);
  return {
    date: targetDate,
    solvedCount: 0,
    dailyGoal: goal,
    completed: false,
    remaining: goal,
  };
}

// Increment the user's solved count for a day by `delta` (default 1), upserting
// the row and refreshing the dynamic daily goal. Returns the updated row and
// whether the daily goal transitioned to "completed" during this call.
export async function incrementDailyProgress(
  userId: string,
  date: string,
  delta = 1
): Promise<{ row: DailyProgress; justCompleted: boolean }> {
  const goal = await getDailyGoal(userId);

  const existing = await db
    .select()
    .from(dailyProgress)
    .where(
      and(
        eq(dailyProgress.userId, userId),
        eq(dailyProgress.progressDate, date)
      )
    )
    .limit(1);

  const wasCompleted = existing[0]?.completed ?? false;
  const newCount = (existing[0]?.solvedCount ?? 0) + delta;
  const completed = newCount >= goal;

  const upserted = await db
    .insert(dailyProgress)
    .values({
      userId,
      progressDate: date,
      solvedCount: newCount,
      dailyGoal: goal,
      completed,
    })
    .onConflictDoUpdate({
      target: [dailyProgress.userId, dailyProgress.progressDate],
      set: {
        solvedCount: newCount,
        dailyGoal: goal,
        completed,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    row: upserted[0],
    justCompleted: completed && !wasCompleted,
  };
}
