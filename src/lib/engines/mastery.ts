// Topic mastery engine.
//
// Mastery is NOT solved/total. It is a weighted combination of four components,
// each normalized to 0–100:
//
//   Self Assessment (20%) — the user's onboarding rating (0–10 -> 0–100).
//     Anchors an initial estimate but must not permanently dominate.
//   Coverage        (30%) — fraction of the topic's problem space covered by
//     TRACKED Path Pointer solves. Baseline solves are NOT counted here because
//     the baseline has no topic-level information.
//   Difficulty      (30%) — weighted difficulty of tracked solves, capped so a
//     single Hard problem cannot make a topic look mastered.
//   Consistency     (20%) — recent solving activity in the topic (last 30 days),
//     rewarding sustained practice over a single burst day.
//
// As objective components (coverage/difficulty/consistency) grow through real
// solving, they progressively outweigh the fixed self-assessment anchor.

import { eq, and, gte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  problems,
  userProblems,
  userTopicRatings,
  topicMastery,
  topics,
} from "@/db/schema";
import { clamp, round, DIFFICULTY_POINTS } from "@/lib/utils/calculations";
import { toLocalDateString, addDays } from "@/lib/utils/dates";
import type { TopicMastery } from "@/db/schema";

export const MASTERY_WEIGHTS = {
  selfAssessment: 0.2,
  coverage: 0.3,
  difficulty: 0.3,
  consistency: 0.2,
} as const;

// A topic is considered "well covered" when the user has tracked-solved this
// many problems (or 40% of available, whichever is smaller). Used to normalize
// coverage so small topics are not trivially maxed.
const COVERAGE_TARGET_ABS = 15;
const COVERAGE_TARGET_FRAC = 0.4;

// Difficulty score target: total weighted difficulty points that represent a
// strong, balanced practice set for a topic.
const DIFFICULTY_TARGET_POINTS = 25;

// Consistency window.
const CONSISTENCY_WINDOW_DAYS = 30;
const CONSISTENCY_TARGET_ACTIVE_DAYS = 10;

interface MasteryComponents {
  selfAssessmentScore: number;
  coverageScore: number;
  difficultyScore: number;
  consistencyScore: number;
  mastery: number;
  solvedCount: number;
}

async function computeComponents(
  userId: string,
  topicId: string,
  today: string
): Promise<MasteryComponents> {
  const windowStart = addDays(today, -(CONSISTENCY_WINDOW_DAYS - 1));

  const [ratingRows, totalProblemRows, solvedRows] = await Promise.all([
    db
      .select({ rating: userTopicRatings.rating })
      .from(userTopicRatings)
      .where(
        and(
          eq(userTopicRatings.userId, userId),
          eq(userTopicRatings.topicId, topicId)
        )
      )
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(problems)
      .where(eq(problems.topicId, topicId)),
    db
      .select({
        difficulty: problems.difficulty,
        solvedDate: userProblems.solvedDate,
      })
      .from(userProblems)
      .innerJoin(problems, eq(userProblems.problemId, problems.id))
      .where(
        and(eq(userProblems.userId, userId), eq(problems.topicId, topicId))
      ),
  ]);

  // ---- Self assessment (0-10 -> 0-100) ----
  const rating = ratingRows[0]?.rating ?? 0;
  const selfAssessmentScore = clamp(rating * 10, 0, 100);

  const totalProblems = totalProblemRows[0]?.count ?? 0;
  const solvedCount = solvedRows.length;

  // ---- Coverage ----
  const coverageTarget = Math.max(
    1,
    Math.min(COVERAGE_TARGET_ABS, Math.ceil(totalProblems * COVERAGE_TARGET_FRAC))
  );
  const coverageScore = clamp((solvedCount / coverageTarget) * 100, 0, 100);

  // ---- Difficulty (weighted points, capped) ----
  let points = 0;
  for (const s of solvedRows) {
    points += DIFFICULTY_POINTS[s.difficulty as keyof typeof DIFFICULTY_POINTS];
  }
  const difficultyScore = clamp((points / DIFFICULTY_TARGET_POINTS) * 100, 0, 100);

  // ---- Consistency (distinct active days within the window) ----
  const activeDays = new Set<string>();
  for (const s of solvedRows) {
    if (s.solvedDate >= windowStart && s.solvedDate <= today) {
      activeDays.add(s.solvedDate);
    }
  }
  const consistencyScore = clamp(
    (activeDays.size / CONSISTENCY_TARGET_ACTIVE_DAYS) * 100,
    0,
    100
  );

  const mastery =
    selfAssessmentScore * MASTERY_WEIGHTS.selfAssessment +
    coverageScore * MASTERY_WEIGHTS.coverage +
    difficultyScore * MASTERY_WEIGHTS.difficulty +
    consistencyScore * MASTERY_WEIGHTS.consistency;

  return {
    selfAssessmentScore: round(selfAssessmentScore),
    coverageScore: round(coverageScore),
    difficultyScore: round(difficultyScore),
    consistencyScore: round(consistencyScore),
    mastery: round(clamp(mastery, 0, 100)),
    solvedCount,
  };
}

async function upsertMastery(
  userId: string,
  topicId: string,
  c: MasteryComponents
): Promise<TopicMastery> {
  const rows = await db
    .insert(topicMastery)
    .values({
      userId,
      topicId,
      mastery: c.mastery,
      coverageScore: c.coverageScore,
      difficultyScore: c.difficultyScore,
      consistencyScore: c.consistencyScore,
      selfAssessmentScore: c.selfAssessmentScore,
      solvedCount: c.solvedCount,
    })
    .onConflictDoUpdate({
      target: [topicMastery.userId, topicMastery.topicId],
      set: {
        mastery: c.mastery,
        coverageScore: c.coverageScore,
        difficultyScore: c.difficultyScore,
        consistencyScore: c.consistencyScore,
        selfAssessmentScore: c.selfAssessmentScore,
        solvedCount: c.solvedCount,
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0];
}

export async function calculateTopicMastery(
  userId: string,
  topicId: string,
  timezone?: string
): Promise<TopicMastery> {
  const today = toLocalDateString(new Date(), timezone);
  const components = await computeComponents(userId, topicId, today);
  return upsertMastery(userId, topicId, components);
}

export async function calculateAllTopicMastery(
  userId: string,
  timezone?: string
): Promise<TopicMastery[]> {
  const today = toLocalDateString(new Date(), timezone);
  const allTopics = await db.select({ id: topics.id }).from(topics);
  const results: TopicMastery[] = [];
  for (const t of allTopics) {
    const components = await computeComponents(userId, t.id, today);
    results.push(await upsertMastery(userId, t.id, components));
  }
  return results;
}

// Initialize mastery rows for all topics (used during onboarding). Seeds the
// self-assessment component from ratings; objective components start near 0.
export async function initializeTopicMastery(userId: string): Promise<void> {
  await calculateAllTopicMastery(userId);
}

// Read stored mastery for the user's topics, joined with topic names.
export async function getStoredMastery(userId: string) {
  return db
    .select({
      topicId: topicMastery.topicId,
      topicName: topics.name,
      mastery: topicMastery.mastery,
      coverageScore: topicMastery.coverageScore,
      difficultyScore: topicMastery.difficultyScore,
      consistencyScore: topicMastery.consistencyScore,
      selfAssessmentScore: topicMastery.selfAssessmentScore,
      solvedCount: topicMastery.solvedCount,
    })
    .from(topicMastery)
    .innerJoin(topics, eq(topicMastery.topicId, topics.id))
    .where(eq(topicMastery.userId, userId))
    .orderBy(topics.displayOrder);
}

// Recalculate mastery only for the topics affected by a set of problem ids.
export async function recalculateMasteryForProblems(
  userId: string,
  problemIds: string[]
): Promise<void> {
  if (problemIds.length === 0) return;
  const topicRows = await db
    .selectDistinct({ topicId: problems.topicId })
    .from(problems)
    .where(inArray(problems.id, problemIds));
  const today = toLocalDateString(new Date());
  for (const { topicId } of topicRows) {
    const c = await computeComponents(userId, topicId, today);
    await upsertMastery(userId, topicId, c);
  }
}
