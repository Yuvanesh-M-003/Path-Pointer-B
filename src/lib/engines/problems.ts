// Problem catalog querying: filtering, search, pagination, safe sorting.

import {
  eq,
  and,
  or,
  ilike,
  isNotNull,
  isNull,
  sql,
  asc,
  desc,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { problems, topics, subtopics, userProblems } from "@/db/schema";
import type { ProblemFilters } from "@/lib/validation/problems";

export interface ProblemView {
  id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  url: string | null;
  topicId: string;
  topic: string;
  subtopicId: string | null;
  subtopic: string | null;
  solved: boolean;
}

export interface PaginatedProblems {
  problems: ProblemView[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listProblems(
  userId: string,
  filters: ProblemFilters
): Promise<PaginatedProblems> {
  const conditions: SQL[] = [];

  if (filters.topic) {
    conditions.push(
      or(
        ilike(topics.name, filters.topic),
        ilike(topics.slug, filters.topic)
      ) as SQL
    );
  }
  if (filters.subtopic) {
    conditions.push(
      or(
        ilike(subtopics.name, filters.subtopic),
        ilike(subtopics.slug, filters.subtopic)
      ) as SQL
    );
  }
  if (filters.difficulty) {
    conditions.push(eq(problems.difficulty, filters.difficulty));
  }
  if (filters.search) {
    conditions.push(ilike(problems.title, `%${filters.search}%`));
  }
  if (filters.status === "solved") {
    conditions.push(isNotNull(userProblems.id));
  } else if (filters.status === "unsolved") {
    conditions.push(isNull(userProblems.id));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  // Safe sort mapping (never interpolate raw user strings).
  const dir = filters.order === "desc" ? desc : asc;
  const sortColumn =
    filters.sort === "title"
      ? problems.title
      : filters.sort === "difficulty"
        ? problems.difficulty
        : problems.displayOrder;

  const offset = (filters.page - 1) * filters.limit;

  const [rows, countRows, solvedRows] = await Promise.all([
    db
      .select({
        id: problems.id,
        title: problems.title,
        slug: problems.slug,
        difficulty: problems.difficulty,
        url: problems.url,
        topicId: problems.topicId,
        topic: topics.name,
        subtopicId: problems.subtopicId,
        subtopic: subtopics.name,
      })
      .from(problems)
      .innerJoin(topics, eq(problems.topicId, topics.id))
      .leftJoin(subtopics, eq(problems.subtopicId, subtopics.id))
      .leftJoin(
        userProblems,
        and(
          eq(userProblems.problemId, problems.id),
          eq(userProblems.userId, userId)
        )
      )
      .where(where)
      .orderBy(dir(sortColumn))
      .limit(filters.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(problems)
      .innerJoin(topics, eq(problems.topicId, topics.id))
      .leftJoin(subtopics, eq(problems.subtopicId, subtopics.id))
      .leftJoin(
        userProblems,
        and(
          eq(userProblems.problemId, problems.id),
          eq(userProblems.userId, userId)
        )
      )
      .where(where),
    db
      .select({ problemId: userProblems.problemId })
      .from(userProblems)
      .where(eq(userProblems.userId, userId)),
  ]);

  const solvedSet = new Set(solvedRows.map((r) => r.problemId));
  const total = countRows[0]?.count ?? 0;

  return {
    problems: rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      difficulty: r.difficulty as ProblemView["difficulty"],
      url: r.url,
      topicId: r.topicId,
      topic: r.topic,
      subtopicId: r.subtopicId,
      subtopic: r.subtopic,
      solved: solvedSet.has(r.id),
    })),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function getProblemById(
  userId: string,
  problemId: string
): Promise<ProblemView | null> {
  const rows = await db
    .select({
      id: problems.id,
      title: problems.title,
      slug: problems.slug,
      difficulty: problems.difficulty,
      url: problems.url,
      topicId: problems.topicId,
      topic: topics.name,
      subtopicId: problems.subtopicId,
      subtopic: subtopics.name,
    })
    .from(problems)
    .innerJoin(topics, eq(problems.topicId, topics.id))
    .leftJoin(subtopics, eq(problems.subtopicId, subtopics.id))
    .where(eq(problems.id, problemId))
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];

  const solved = await db
    .select({ id: userProblems.id })
    .from(userProblems)
    .where(
      and(
        eq(userProblems.userId, userId),
        eq(userProblems.problemId, problemId)
      )
    )
    .limit(1);

  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    difficulty: r.difficulty as ProblemView["difficulty"],
    url: r.url,
    topicId: r.topicId,
    topic: r.topic,
    subtopicId: r.subtopicId,
    subtopic: r.subtopic,
    solved: solved.length > 0,
  };
}
