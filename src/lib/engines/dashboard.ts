// Dashboard aggregation — a single efficient call for the whole dashboard.

import { eq, and, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyProgress } from "@/db/schema";
import { toLocalDateString, addDays, dateRange } from "@/lib/utils/dates";
import { getUserSolvedStats } from "./solvedStats";
import { getDailyProgress } from "./dailyProgress";
import { getCurrentStreak, getLongestStreak } from "./streak";
import { getStoredMastery } from "./mastery";
import { getWeakTopics } from "./weakTopics";
import { getRecommendations } from "./recommendation";
import { getTop150Counts } from "./top150";
import { getNotifications, getUnreadCount } from "./notifications";
import { getProfileView } from "./profile";
import type { Profile } from "@/db/schema";

export async function getDashboard(profile: Profile, timezone?: string) {
  const userId = profile.id;
  const today = toLocalDateString(new Date(), timezone);
  const weekStart = addDays(today, -6);

  const [
    profileView,
    solvedStats,
    todayProgress,
    streak,
    longestStreak,
    mastery,
    weakTopics,
    recommendations,
    top150,
    notifications,
    unreadCount,
    weekRows,
  ] = await Promise.all([
    getProfileView(profile),
    getUserSolvedStats(userId),
    getDailyProgress(userId, today, timezone),
    getCurrentStreak(userId, timezone),
    getLongestStreak(userId),
    getStoredMastery(userId),
    getWeakTopics(userId, 5),
    getRecommendations(userId, timezone),
    getTop150Counts(userId),
    getNotifications(userId, { limit: 10 }),
    getUnreadCount(userId),
    db
      .select({
        date: dailyProgress.progressDate,
        solved: dailyProgress.solvedCount,
        goal: dailyProgress.dailyGoal,
        completed: dailyProgress.completed,
      })
      .from(dailyProgress)
      .where(
        and(
          eq(dailyProgress.userId, userId),
          gte(dailyProgress.progressDate, weekStart)
        )
      ),
  ]);

  const byDate = new Map(weekRows.map((r) => [r.date, r]));
  const weeklyProgress = dateRange(weekStart, today).map((d) => {
    const row = byDate.get(d);
    return {
      date: d,
      solved: row?.solved ?? 0,
      goal: row?.goal ?? 0,
      completed: row?.completed ?? false,
    };
  });

  return {
    profile: profileView,
    solvedStats,
    today: todayProgress,
    streak,
    longestStreak,
    weeklyProgress,
    mastery,
    weakTopics,
    recommendations,
    top150: {
      total: top150.total,
      solved: top150.solved,
      completionPercentage: top150.total
        ? Math.round((top150.solved / top150.total) * 10000) / 100
        : 0,
    },
    notifications,
    unreadCount,
  };
}


