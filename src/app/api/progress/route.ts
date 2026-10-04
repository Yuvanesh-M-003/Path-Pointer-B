import { withOnboardedAuth } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import { getActivitySeries } from "@/lib/engines/analytics";
import { getCurrentStreak, getLongestStreak } from "@/lib/engines/streak";
import { getUserSolvedStats } from "@/lib/engines/solvedStats";

import { corsPreflightResponse } from "@/lib/api/cors";

export interface ProgressSnapshot {
  totals: { easy: number; medium: number; hard: number };
  baseline: { easy: number; medium: number; hard: number };
  path_pointer: { easy: number; medium: number; hard: number };
  solved_this_week: number;
  solved_this_month: number;
  current_streak: number;
  longest_streak: number;
  daily_activity: { date: string; count: number }[];
  monthly_activity: { month: string; count: number }[];
}

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/progress — snapshot view for the progress dashboard.
export async function GET(req: Request) {
  return withOnboardedAuth(req, async ({ userId }) => {
    const timezone =
      new URL(req.url).searchParams.get("timezone") ?? undefined;

    const [stats, streak, longestStreak, { dailyActivity, monthlyActivity }] =
      await Promise.all([
        getUserSolvedStats(userId),
        getCurrentStreak(userId, timezone),
        getLongestStreak(userId),
        getActivitySeries(userId, timezone),
      ]);

    const now = new Date();
    const today = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );
    const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

    const solvedThisWeek = dailyActivity
      .filter((point) => {
        const pointDate = new Date(`${point.date}T00:00:00.000Z`);
        return pointDate >= weekAgo && pointDate <= today;
      })
      .reduce((sum, point) => sum + point.count, 0);

    const solvedThisMonth = dailyActivity
      .filter((point) => {
        const pointDate = new Date(`${point.date}T00:00:00.000Z`);
        return pointDate >= monthAgo && pointDate <= today;
      })
      .reduce((sum, point) => sum + point.count, 0);

    const snapshot: ProgressSnapshot = {
      totals: {
        easy: stats.total.easy,
        medium: stats.total.medium,
        hard: stats.total.hard,
      },
      baseline: {
        easy: stats.baseline.easy,
        medium: stats.baseline.medium,
        hard: stats.baseline.hard,
      },
      path_pointer: {
        easy: stats.tracked.easy,
        medium: stats.tracked.medium,
        hard: stats.tracked.hard,
      },
      solved_this_week: solvedThisWeek,
      solved_this_month: solvedThisMonth,
      current_streak: streak,
      longest_streak: longestStreak,
      daily_activity: dailyActivity,
      monthly_activity: monthlyActivity.map(({ month, solved }) => ({
        month,
        count: solved,
      })),
    };

    return ok(snapshot);
  });
}
