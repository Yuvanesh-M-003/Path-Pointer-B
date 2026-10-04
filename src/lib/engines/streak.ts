// Streak engine.
//
// A day is "active" when solved_count > 0. The current streak counts
// consecutive active days backwards from today (or yesterday, so the streak is
// not considered broken before the user has solved anything today).

import { eq, and, gt, desc } from "drizzle-orm";
import { db } from "@/db";
import { dailyProgress } from "@/db/schema";
import { toLocalDateString, addDays } from "@/lib/utils/dates";

export async function getCurrentStreak(
  userId: string,
  timezone?: string
): Promise<number> {
  const today = toLocalDateString(new Date(), timezone);

  const activeDays = await db
    .select({ date: dailyProgress.progressDate })
    .from(dailyProgress)
    .where(
      and(eq(dailyProgress.userId, userId), gt(dailyProgress.solvedCount, 0))
    )
    .orderBy(desc(dailyProgress.progressDate));

  if (activeDays.length === 0) return 0;

  const activeSet = new Set(activeDays.map((d) => d.date));

  // Start from today if active, else from yesterday (grace for "not yet today").
  let cursor = activeSet.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (activeSet.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Longest streak across all history (used for milestone notifications/analytics).
export async function getLongestStreak(userId: string): Promise<number> {
  const activeDays = await db
    .select({ date: dailyProgress.progressDate })
    .from(dailyProgress)
    .where(
      and(eq(dailyProgress.userId, userId), gt(dailyProgress.solvedCount, 0))
    )
    .orderBy(dailyProgress.progressDate);

  if (activeDays.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < activeDays.length; i += 1) {
    const prev = activeDays[i - 1].date;
    const cur = activeDays[i].date;
    if (addDays(prev, 1) === cur) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}
