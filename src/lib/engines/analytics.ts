// Analytics engine — produces chart-ready data for the progress page.

import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyProgress } from "@/db/schema";
import { toLocalDateString, addDays, dateRange } from "@/lib/utils/dates";
import { getUserSolvedStats } from "./solvedStats";
import { getStoredMastery } from "./mastery";
import { getCurrentStreak, getLongestStreak } from "./streak";
import type { HeatmapPoint, SolvedStats } from "@/lib/types";

export interface WeeklyActivityPoint {
  date: string;
  solved: number;
  goal: number;
  completed: boolean;
}

export interface MonthlyActivityPoint {
  month: string; // YYYY-MM
  solved: number;
}

export interface RadarPoint {
  topic: string;
  mastery: number;
}

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface AnalyticsView {
  solvedStats: SolvedStats;
  difficultyDistribution: DifficultyDistribution;
  radar: RadarPoint[];
  weeklyActivity: WeeklyActivityPoint[];
  monthlyActivity: MonthlyActivityPoint[];
  dailyActivity: HeatmapPoint[];
  heatmap: HeatmapPoint[];
  streak: number;
  longestStreak: number;
}

export async function getActivitySeries(
  userId: string,
  timezone?: string
): Promise<{
  dailyActivity: HeatmapPoint[];
  monthlyActivity: MonthlyActivityPoint[];
}> {
  const today = toLocalDateString(new Date(), timezone);
  const heatmapStart = addDays(today, -364); // ~1 year

  const dailyRows = await db
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
        gte(dailyProgress.progressDate, heatmapStart)
      )
    )
    .orderBy(dailyProgress.progressDate);

  const byDate = new Map(dailyRows.map((r) => [r.date, r]));

  const dailyActivity: HeatmapPoint[] = dateRange(heatmapStart, today).map(
    (d) => ({
      date: d,
      count: byDate.get(d)?.solved ?? 0,
    })
  );

  const monthlyMap = new Map<string, number>();
  for (const r of dailyRows) {
    const month = r.date.slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + r.solved);
  }
  const monthlyActivity: MonthlyActivityPoint[] = Array.from(
    monthlyMap.entries()
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, solved]) => ({ month, solved }));

  return { dailyActivity, monthlyActivity };
}

export async function getAnalytics(
  userId: string,
  timezone?: string
): Promise<AnalyticsView> {
  const today = toLocalDateString(new Date(), timezone);
  const heatmapStart = addDays(today, -364); // ~1 year
  const weekStart = addDays(today, -6);

  const [solvedStats, mastery, streak, longestStreak, dailyRows] =
    await Promise.all([
      getUserSolvedStats(userId),
      getStoredMastery(userId),
      getCurrentStreak(userId, timezone),
      getLongestStreak(userId),
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
            gte(dailyProgress.progressDate, heatmapStart)
          )
        )
        .orderBy(dailyProgress.progressDate),
    ]);

  const byDate = new Map(dailyRows.map((r) => [r.date, r]));

  const heatmap: HeatmapPoint[] = dateRange(heatmapStart, today).map((d) => ({
    date: d,
    count: byDate.get(d)?.solved ?? 0,
  }));

  const weeklyActivity: WeeklyActivityPoint[] = dateRange(weekStart, today).map(
    (d) => {
      const row = byDate.get(d);
      return {
        date: d,
        solved: row?.solved ?? 0,
        goal: row?.goal ?? 0,
        completed: row?.completed ?? false,
      };
    }
  );

  const { monthlyActivity } = await getActivitySeries(userId, timezone);
  const radar: RadarPoint[] = mastery.map((m) => ({
    topic: m.topicName,
    mastery: m.mastery,
  }));

  return {
    solvedStats,
    difficultyDistribution: {
      easy: solvedStats.total.easy,
      medium: solvedStats.total.medium,
      hard: solvedStats.total.hard,
    },
    radar,
    weeklyActivity,
    monthlyActivity,
    dailyActivity: heatmap,
    heatmap,
    streak,
    longestStreak,
  };
}


