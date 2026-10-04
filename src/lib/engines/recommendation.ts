// Recommendation engine.
//
// Generates a daily set of problem recommendations, prioritizing weak topics
// while keeping topic diversity. Rules:
//
//   - The system does NOT know the user's full LeetCode history. A problem is
//     only "known solved" once it exists in user_problems. Solved problems are
//     never recommended again.
//   - Daily recommendation count scales with user level & daily goal (2–9).
//   - Diversity: avoid recommending many problems from the same topic unless a
//     topic is very weak (focused practice).
//   - Difficulty is matched to topic strength (weaker -> easier bias).

import { eq, and, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { problems, recommendations, topics, userProblems } from "@/db/schema";
import { toLocalDateString } from "@/lib/utils/dates";
import { getStoredMastery } from "./mastery";
import { getDailyGoal } from "./goals";
import { getTotalSolved } from "./solvedStats";
import type { RecommendationView } from "@/lib/types";

type Difficulty = "Easy" | "Medium" | "Hard";

function userLevel(total: number): "beginner" | "intermediate" | "advanced" {
  if (total <= 100) return "beginner";
  if (total <= 400) return "intermediate";
  return "advanced";
}

// How many recommendations to generate for the day.
function recommendationCount(
  level: "beginner" | "intermediate" | "advanced",
  dailyGoal: number
): number {
  let base: number;
  if (level === "beginner") base = 3;
  else if (level === "intermediate") base = 5;
  else base = 7;
  // Nudge up for higher daily goals, cap 2..9.
  const scaled = base + Math.max(0, dailyGoal - 3);
  return Math.max(2, Math.min(9, scaled));
}

// Preferred difficulty distribution based on topic mastery.
function preferredDifficulty(mastery: number): Difficulty {
  if (mastery < 35) return "Easy";
  if (mastery < 70) return "Medium";
  return "Hard";
}

export async function generateRecommendations(
  userId: string,
  timezone?: string
): Promise<RecommendationView[]> {
  const today = toLocalDateString(new Date(), timezone);

  const [total, dailyGoal, mastery] = await Promise.all([
    getTotalSolved(userId),
    getDailyGoal(userId),
    getStoredMastery(userId),
  ]);

  const level = userLevel(total);
  const target = recommendationCount(level, dailyGoal);

  // Solved problems (never recommend again).
  const solvedRows = await db
    .select({ problemId: userProblems.problemId })
    .from(userProblems)
    .where(eq(userProblems.userId, userId));
  const solvedIds = solvedRows.map((r) => r.problemId);

  // Rank topics weakest-first (lowest mastery first). If no mastery yet, use
  // all topics in display order.
  let rankedTopics: { topicId: string; mastery: number }[];
  if (mastery.length > 0) {
    rankedTopics = [...mastery]
      .sort((a, b) => a.mastery - b.mastery)
      .map((m) => ({ topicId: m.topicId, mastery: m.mastery }));
  } else {
    const all = await db
      .select({ topicId: topics.id })
      .from(topics)
      .orderBy(topics.displayOrder);
    rankedTopics = all.map((t) => ({ topicId: t.topicId, mastery: 0 }));
  }

  const picks: {
    problemId: string;
    topicId: string;
    reason: string;
    score: number;
  }[] = [];
  const usedProblemIds = new Set<string>(solvedIds);
  // How many picks allowed per topic before we round-robin (diversity).
  const perTopicSoftCap = 2;
  const topicPickCount = new Map<string, number>();

  // Two passes: pass 1 respects the soft cap for diversity, pass 2 fills any
  // remaining slots (allowing focused practice on the weakest topics).
  for (let pass = 0; pass < 2 && picks.length < target; pass += 1) {
    for (const t of rankedTopics) {
      if (picks.length >= target) break;
      if (pass === 0 && (topicPickCount.get(t.topicId) ?? 0) >= perTopicSoftCap) {
        continue;
      }

      const desired = preferredDifficulty(t.mastery);
      const candidate = await pickCandidate(
        t.topicId,
        desired,
        usedProblemIds
      );
      if (!candidate) continue;

      usedProblemIds.add(candidate.id);
      topicPickCount.set(
        t.topicId,
        (topicPickCount.get(t.topicId) ?? 0) + 1
      );
      // Score: weaker topic => higher score.
      const score = Math.round((100 - t.mastery) * 100) / 100;
      picks.push({
        problemId: candidate.id,
        topicId: t.topicId,
        reason: buildReason(t.mastery, candidate.difficulty as Difficulty),
        score,
      });
    }
  }

  if (picks.length === 0) return getRecommendations(userId, timezone);

  // Persist: clear today's pending recommendations, then upsert new ones.
  await db
    .delete(recommendations)
    .where(
      and(
        eq(recommendations.userId, userId),
        eq(recommendations.recommendedDate, today),
        eq(recommendations.status, "pending")
      )
    );

  await db
    .insert(recommendations)
    .values(
      picks.map((p) => ({
        userId,
        problemId: p.problemId,
        topicId: p.topicId,
        reason: p.reason,
        score: p.score,
        status: "pending" as const,
        recommendedDate: today,
      }))
    )
    .onConflictDoNothing({
      target: [
        recommendations.userId,
        recommendations.recommendedDate,
        recommendations.problemId,
      ],
    });

  return getRecommendations(userId, timezone);
}

async function pickCandidate(
  topicId: string,
  desired: Difficulty,
  used: Set<string>,
  fallbackAll = true
): Promise<{ id: string; difficulty: string } | null> {
  const usedArr = Array.from(used);
  const notUsed =
    usedArr.length > 0 ? notInArray(problems.id, usedArr) : undefined;

  // Try desired difficulty first.
  const preferred = await db
    .select({ id: problems.id, difficulty: problems.difficulty })
    .from(problems)
    .where(
      and(
        eq(problems.topicId, topicId),
        eq(problems.difficulty, desired),
        ...(notUsed ? [notUsed] : [])
      )
    )
    .orderBy(problems.displayOrder)
    .limit(1);
  if (preferred.length > 0) return preferred[0];

  if (!fallbackAll) return null;

  // Fallback: any unsolved problem in the topic.
  const any = await db
    .select({ id: problems.id, difficulty: problems.difficulty })
    .from(problems)
    .where(
      and(eq(problems.topicId, topicId), ...(notUsed ? [notUsed] : []))
    )
    .orderBy(problems.displayOrder)
    .limit(1);
  return any[0] ?? null;
}

function buildReason(mastery: number, difficulty: Difficulty): string {
  if (mastery < 35) {
    return `Weak topic — start with a ${difficulty} problem to build fundamentals`;
  }
  if (mastery < 70) {
    return `Strengthen this topic with a ${difficulty} problem`;
  }
  return `Challenge yourself with a ${difficulty} problem to reach mastery`;
}

// Fetch today's recommendations (joined view).
export async function getRecommendations(
  userId: string,
  timezone?: string
): Promise<RecommendationView[]> {
  const today = toLocalDateString(new Date(), timezone);
  const rows = await db
    .select({
      id: recommendations.id,
      problemId: recommendations.problemId,
      topicId: recommendations.topicId,
      topic: topics.name,
      title: problems.title,
      slug: problems.slug,
      difficulty: problems.difficulty,
      url: problems.url,
      reason: recommendations.reason,
      score: recommendations.score,
      status: recommendations.status,
    })
    .from(recommendations)
    .innerJoin(problems, eq(recommendations.problemId, problems.id))
    .innerJoin(topics, eq(recommendations.topicId, topics.id))
    .where(
      and(
        eq(recommendations.userId, userId),
        eq(recommendations.recommendedDate, today)
      )
    )
    .orderBy(sql`${recommendations.score} DESC`);

  return rows.map((r) => ({
    id: r.id,
    problemId: r.problemId,
    topicId: r.topicId,
    topic: r.topic,
    title: r.title,
    slug: r.slug,
    difficulty: r.difficulty as Difficulty,
    url: r.url,
    reason: r.reason,
    score: r.score,
    status: r.status as RecommendationView["status"],
  }));
}

// When a problem is solved, mark any matching pending recommendations complete.
export async function markRecommendationsCompleted(
  userId: string,
  problemId: string
): Promise<void> {
  await db
    .update(recommendations)
    .set({ status: "completed", completedAt: new Date() })
    .where(
      and(
        eq(recommendations.userId, userId),
        eq(recommendations.problemId, problemId),
        eq(recommendations.status, "pending")
      )
    );
}


