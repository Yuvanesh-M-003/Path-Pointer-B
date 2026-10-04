// Solve-problem pipeline (the core write path).
//
// Idempotent: solving the same problem twice counts only once, enforced by the
// unique (user_id, problem_id) constraint on user_problems.
//
// Atomicity: all writes execute inside a single Postgres transaction so the
// database is never left in an obviously inconsistent state. (In production on
// Supabase, the standard JS client cannot run multi-statement transactions;
// the equivalent would be a Postgres RPC / SQL function. Here we use Drizzle's
// transaction support against Postgres directly, which is the safest option.)
//
// Steps: insert solve -> daily progress -> streak -> mastery -> roadmap ->
// recommendations -> notifications.

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { problems, userProblems } from "@/db/schema";
import { AppError } from "@/lib/utils/errors";
import { toLocalDateString } from "@/lib/utils/dates";
import { incrementDailyProgress, toView } from "./dailyProgress";
import { getCurrentStreak } from "./streak";
import { recalculateMasteryForProblems, calculateTopicMastery } from "./mastery";
import { updateRoadmapForProblems } from "./roadmap";
import { markRecommendationsCompleted } from "./recommendation";
import { getUserSolvedStats } from "./solvedStats";
import { getTop150Counts } from "./top150";
import {
  notifyDailyGoalCompleted,
  notifyStreakMilestone,
  notifyTop150Milestone,
} from "./notifications";
import type { SolvedStats, DailyProgressView } from "@/lib/types";
import type { TopicMastery } from "@/db/schema";

export interface SolveResult {
  problemSolved: boolean;
  alreadySolved: boolean;
  solvedStats: SolvedStats;
  dailyProgress: DailyProgressView;
  streak: number;
  mastery: TopicMastery | null;
}

export async function solveProblem(
  userId: string,
  problemId: string,
  opts: { notes?: string; timezone?: string } = {}
): Promise<SolveResult> {
  // Verify the problem exists and get its topic.
  const problemRows = await db
    .select({ id: problems.id, topicId: problems.topicId })
    .from(problems)
    .where(eq(problems.id, problemId))
    .limit(1);
  if (problemRows.length === 0) {
    throw new AppError("PROBLEM_NOT_FOUND", "Problem not found");
  }
  const topicId = problemRows[0].topicId;

  const today = toLocalDateString(new Date(), opts.timezone);

  // --- Idempotent insert inside a transaction ---
  const { inserted } = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: userProblems.id })
      .from(userProblems)
      .where(
        and(
          eq(userProblems.userId, userId),
          eq(userProblems.problemId, problemId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { inserted: false as const };
    }

    const insertRes = await tx
      .insert(userProblems)
      .values({
        userId,
        problemId,
        solvedDate: today,
        notes: opts.notes ?? null,
      })
      .onConflictDoNothing({
        target: [userProblems.userId, userProblems.problemId],
      })
      .returning({ id: userProblems.id });

    return { inserted: insertRes.length > 0 };
  });

  if (!inserted) {
    // Already solved — return current state, count unchanged (idempotent).
    const [solvedStats, mastery] = await Promise.all([
      getUserSolvedStats(userId),
      getStoredTopicMastery(userId, topicId),
    ]);
    const dp = await getTodayProgress(userId, today, opts.timezone);
    const streak = await getCurrentStreak(userId, opts.timezone);
    return {
      problemSolved: false,
      alreadySolved: true,
      solvedStats,
      dailyProgress: dp,
      streak,
      mastery,
    };
  }

  // --- Newly solved: run the downstream updates ---
  const { row: dpRow, justCompleted } = await incrementDailyProgress(
    userId,
    today,
    1
  );

  const [mastery] = await Promise.all([
    calculateTopicMastery(userId, topicId, opts.timezone),
    updateRoadmapForProblems(userId, [problemId]),
    markRecommendationsCompleted(userId, problemId),
  ]);

  const streak = await getCurrentStreak(userId, opts.timezone);

  // Notifications (deduped).
  if (justCompleted) {
    await notifyDailyGoalCompleted(userId, today, dpRow.dailyGoal);
  }
  await notifyStreakMilestone(userId, streak);
  const top150 = await getTop150Counts(userId);
  await notifyTop150Milestone(userId, top150.solved, top150.total);

  const solvedStats = await getUserSolvedStats(userId);

  return {
    problemSolved: true,
    alreadySolved: false,
    solvedStats,
    dailyProgress: toView(dpRow),
    streak,
    mastery,
  };
}

async function getStoredTopicMastery(
  userId: string,
  topicId: string
): Promise<TopicMastery | null> {
  const { topicMastery } = await import("@/db/schema");
  const rows = await db
    .select()
    .from(topicMastery)
    .where(
      and(eq(topicMastery.userId, userId), eq(topicMastery.topicId, topicId))
    )
    .limit(1);
  return rows[0] ?? null;
}

async function getTodayProgress(
  userId: string,
  today: string,
  timezone?: string
): Promise<DailyProgressView> {
  const { getDailyProgress } = await import("./dailyProgress");
  return getDailyProgress(userId, today, timezone);
}

// re-export for callers/tests
export { recalculateMasteryForProblems };
