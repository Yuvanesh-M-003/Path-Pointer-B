// Top 150 engine.
//
// Solved status is derived, never duplicated into top_150_problems. A Top 150
// entry links to a `problems` row via problem_id; it is solved when that
// problem_id exists in user_problems for the user.

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { top150Problems, userProblems, topics } from "@/db/schema";

export interface Top150ProblemView {
  id: string;
  problemId: string | null;
  topicId: string;
  topic: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  url: string | null;
  solved: boolean;
}

export interface Top150TopicProgress {
  topicId: string;
  topic: string;
  total: number;
  solved: number;
  percentage: number;
}

export interface Top150View {
  total: number;
  solved: number;
  completionPercentage: number;
  byTopic: Top150TopicProgress[];
  problems: Top150ProblemView[];
}

export async function getTop150(userId: string): Promise<Top150View> {
  const [rows, solvedRows] = await Promise.all([
    db
      .select({
        id: top150Problems.id,
        problemId: top150Problems.problemId,
        topicId: top150Problems.topicId,
        topic: topics.name,
        title: top150Problems.title,
        slug: top150Problems.slug,
        difficulty: top150Problems.difficulty,
        url: top150Problems.url,
        displayOrder: top150Problems.displayOrder,
      })
      .from(top150Problems)
      .innerJoin(topics, eq(top150Problems.topicId, topics.id))
      .orderBy(top150Problems.displayOrder),
    db
      .select({ problemId: userProblems.problemId })
      .from(userProblems)
      .where(eq(userProblems.userId, userId)),
  ]);

  const solvedSet = new Set(solvedRows.map((r) => r.problemId));

  const problems: Top150ProblemView[] = rows.map((r) => ({
    id: r.id,
    problemId: r.problemId,
    topicId: r.topicId,
    topic: r.topic,
    title: r.title,
    slug: r.slug,
    difficulty: r.difficulty as Top150ProblemView["difficulty"],
    url: r.url,
    solved: r.problemId ? solvedSet.has(r.problemId) : false,
  }));

  const total = problems.length;
  const solved = problems.filter((p) => p.solved).length;

  const byTopicMap = new Map<string, Top150TopicProgress>();
  for (const p of problems) {
    const entry =
      byTopicMap.get(p.topicId) ??
      { topicId: p.topicId, topic: p.topic, total: 0, solved: 0, percentage: 0 };
    entry.total += 1;
    if (p.solved) entry.solved += 1;
    byTopicMap.set(p.topicId, entry);
  }
  const byTopic = Array.from(byTopicMap.values()).map((e) => ({
    ...e,
    percentage: e.total ? Math.round((e.solved / e.total) * 10000) / 100 : 0,
  }));

  return {
    total,
    solved,
    completionPercentage: total ? Math.round((solved / total) * 10000) / 100 : 0,
    byTopic,
    problems,
  };
}

// Total & solved counts only (used for milestone checks after a solve).
export async function getTop150Counts(
  userId: string
): Promise<{ total: number; solved: number }> {
  const totalRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(top150Problems);
  const total = totalRow[0]?.count ?? 0;

  const solvedRow = await db
    .select({ count: sql<number>`count(distinct ${top150Problems.id})::int` })
    .from(top150Problems)
    .innerJoin(
      userProblems,
      eq(top150Problems.problemId, userProblems.problemId)
    )
    .where(eq(userProblems.userId, userId));
  const solved = solvedRow[0]?.count ?? 0;

  return { total, solved };
}
