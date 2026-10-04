// Solved statistics engine.
//
// Total displayed count = baseline (manually entered at onboarding)
//                         + unique problems solved inside Path Pointer.
//
// The baseline has NO problem-level or topic-level information — it is only
// aggregate Easy/Medium/Hard counts. Tracked solves are per-problem.

import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { userSolvedBaseline, userProblems, problems } from "@/db/schema";
import type { SolvedStats } from "@/lib/types";

export async function getUserSolvedStats(userId: string): Promise<SolvedStats> {
  const [baselineRows, trackedRows] = await Promise.all([
    db
      .select()
      .from(userSolvedBaseline)
      .where(eq(userSolvedBaseline.userId, userId))
      .limit(1),
    db
      .select({
        difficulty: problems.difficulty,
        count: sql<number>`count(*)::int`,
      })
      .from(userProblems)
      .innerJoin(problems, eq(userProblems.problemId, problems.id))
      .where(eq(userProblems.userId, userId))
      .groupBy(problems.difficulty),
  ]);

  const baseline = baselineRows[0];
  const baseEasy = baseline?.easySolved ?? 0;
  const baseMedium = baseline?.mediumSolved ?? 0;
  const baseHard = baseline?.hardSolved ?? 0;

  let trackedEasy = 0;
  let trackedMedium = 0;
  let trackedHard = 0;
  for (const row of trackedRows) {
    if (row.difficulty === "Easy") trackedEasy = row.count;
    else if (row.difficulty === "Medium") trackedMedium = row.count;
    else if (row.difficulty === "Hard") trackedHard = row.count;
  }

  return {
    baseline: {
      easy: baseEasy,
      medium: baseMedium,
      hard: baseHard,
      total: baseEasy + baseMedium + baseHard,
    },
    tracked: {
      easy: trackedEasy,
      medium: trackedMedium,
      hard: trackedHard,
      total: trackedEasy + trackedMedium + trackedHard,
    },
    total: {
      easy: baseEasy + trackedEasy,
      medium: baseMedium + trackedMedium,
      hard: baseHard + trackedHard,
      overall:
        baseEasy +
        baseMedium +
        baseHard +
        trackedEasy +
        trackedMedium +
        trackedHard,
    },
  };
}

// Total solved count including baseline + tracked.
export async function getTotalSolved(userId: string): Promise<number> {
  const stats = await getUserSolvedStats(userId);
  return stats.total.overall;
}

// Count of tracked (Path Pointer) solves only.
export async function getTrackedSolvedCount(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userProblems)
    .where(eq(userProblems.userId, userId));
  return rows[0]?.count ?? 0;
}

// Has the user already solved a specific problem inside Path Pointer?
export async function hasSolvedProblem(
  userId: string,
  problemId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: userProblems.id })
    .from(userProblems)
    .where(
      and(
        eq(userProblems.userId, userId),
        eq(userProblems.problemId, problemId)
      )
    )
    .limit(1);
  return rows.length > 0;
}
