// Roadmap engine.
//
// A roadmap subtopic maps (optionally) to a real `subtopics` row, which groups
// `problems`. Subtopic progress = solved relevant problems / available relevant
// problems, normalized to 0–100. If a roadmap subtopic has no mapped problems,
// we do NOT auto-complete it; it stays not_started/in_progress.

import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  roadmapTopics,
  roadmapSubtopics,
  userRoadmapProgress,
  problems,
  userProblems,
  subtopics,
  topics,
} from "@/db/schema";
import { percentage } from "@/lib/utils/calculations";
import { AppError } from "@/lib/utils/errors";
import { notifyRoadmapMilestone } from "./notifications";

export interface RoadmapSubtopicView {
  id: string;
  title: string;
  subtopicId: string | null;
  status: "not_started" | "in_progress" | "completed";
  progress: number;
  totalProblems: number;
  solvedProblems: number;
}

export interface RoadmapTopicView {
  id: string;
  stage: number;
  title: string;
  description: string | null;
  topicId: string | null;
  topicName: string | null;
  progress: number;
  subtopics: RoadmapSubtopicView[];
}

export interface RoadmapView {
  stages: RoadmapTopicView[];
  overallProgress: number;
}

// Build the full roadmap view for a user in a small number of queries.
export async function getRoadmap(userId: string): Promise<RoadmapView> {
  const [rtRows, rsRows, progressRows] = await Promise.all([
    db
      .select({
        id: roadmapTopics.id,
        stage: roadmapTopics.stage,
        title: roadmapTopics.title,
        description: roadmapTopics.description,
        topicId: roadmapTopics.topicId,
        topicName: topics.name,
        displayOrder: roadmapTopics.displayOrder,
      })
      .from(roadmapTopics)
      .leftJoin(topics, eq(roadmapTopics.topicId, topics.id))
      .orderBy(roadmapTopics.stage, roadmapTopics.displayOrder),
    db
      .select({
        id: roadmapSubtopics.id,
        roadmapTopicId: roadmapSubtopics.roadmapTopicId,
        subtopicId: roadmapSubtopics.subtopicId,
        title: roadmapSubtopics.title,
        displayOrder: roadmapSubtopics.displayOrder,
      })
      .from(roadmapSubtopics)
      .orderBy(roadmapSubtopics.displayOrder),
    db
      .select({
        roadmapSubtopicId: userRoadmapProgress.roadmapSubtopicId,
        status: userRoadmapProgress.status,
        progress: userRoadmapProgress.progress,
      })
      .from(userRoadmapProgress)
      .where(eq(userRoadmapProgress.userId, userId)),
  ]);

  const subtopicIds = rsRows
    .map((r) => r.subtopicId)
    .filter((v): v is string => !!v);

  // Batched counts of total + solved problems per subtopic.
  const [totalCounts, solvedCounts] = await Promise.all([
    subtopicIds.length
      ? db
          .select({
            subtopicId: problems.subtopicId,
            count: sql<number>`count(*)::int`,
          })
          .from(problems)
          .where(inArray(problems.subtopicId, subtopicIds))
          .groupBy(problems.subtopicId)
      : Promise.resolve([] as { subtopicId: string | null; count: number }[]),
    subtopicIds.length
      ? db
          .select({
            subtopicId: problems.subtopicId,
            count: sql<number>`count(*)::int`,
          })
          .from(userProblems)
          .innerJoin(problems, eq(userProblems.problemId, problems.id))
          .where(
            and(
              eq(userProblems.userId, userId),
              inArray(problems.subtopicId, subtopicIds)
            )
          )
          .groupBy(problems.subtopicId)
      : Promise.resolve([] as { subtopicId: string | null; count: number }[]),
  ]);

  const totalBySub = new Map<string, number>();
  for (const r of totalCounts) if (r.subtopicId) totalBySub.set(r.subtopicId, r.count);
  const solvedBySub = new Map<string, number>();
  for (const r of solvedCounts) if (r.subtopicId) solvedBySub.set(r.subtopicId, r.count);

  const progressByRs = new Map(
    progressRows.map((p) => [p.roadmapSubtopicId, p])
  );

  const subsByTopic = new Map<string, RoadmapSubtopicView[]>();
  for (const rs of rsRows) {
    const total = rs.subtopicId ? totalBySub.get(rs.subtopicId) ?? 0 : 0;
    const solved = rs.subtopicId ? solvedBySub.get(rs.subtopicId) ?? 0 : 0;
    const stored = progressByRs.get(rs.id);

    // Derive progress from solved problems if mapped; otherwise use stored.
    let progress: number;
    let status: RoadmapSubtopicView["status"];
    if (total > 0) {
      progress = percentage(solved, total);
      status =
        progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started";
      // Respect a manual "completed"/"in_progress" override if higher.
      if (stored && stored.progress > progress) {
        progress = stored.progress;
        status = stored.status;
      }
    } else {
      progress = stored?.progress ?? 0;
      status = stored?.status ?? "not_started";
    }

    const view: RoadmapSubtopicView = {
      id: rs.id,
      title: rs.title,
      subtopicId: rs.subtopicId,
      status,
      progress,
      totalProblems: total,
      solvedProblems: solved,
    };
    const list = subsByTopic.get(rs.roadmapTopicId) ?? [];
    list.push(view);
    subsByTopic.set(rs.roadmapTopicId, list);
  }

  const stages: RoadmapTopicView[] = rtRows.map((rt) => {
    const subs = subsByTopic.get(rt.id) ?? [];
    const topicProgress =
      subs.length > 0
        ? Math.round((subs.reduce((a, s) => a + s.progress, 0) / subs.length) * 100) /
          100
        : 0;
    return {
      id: rt.id,
      stage: rt.stage,
      title: rt.title,
      description: rt.description,
      topicId: rt.topicId,
      topicName: rt.topicName ?? null,
      progress: topicProgress,
      subtopics: subs,
    };
  });

  const overallProgress =
    stages.length > 0
      ? Math.round(
          (stages.reduce((a, s) => a + s.progress, 0) / stages.length) * 100
        ) / 100
      : 0;

  return { stages, overallProgress };
}

// Recompute stored roadmap progress for the subtopics affected by solved
// problems. Emits a milestone notification when a mapped module reaches 100%.
export async function updateRoadmapForProblems(
  userId: string,
  problemIds: string[]
): Promise<void> {
  if (problemIds.length === 0) return;

  // Which subtopics do these problems belong to?
  const subRows = await db
    .selectDistinct({ subtopicId: problems.subtopicId })
    .from(problems)
    .where(inArray(problems.id, problemIds));
  const affectedSubtopics = subRows
    .map((r) => r.subtopicId)
    .filter((v): v is string => !!v);
  if (affectedSubtopics.length === 0) return;

  // Roadmap subtopics mapped to these subtopics.
  const rsRows = await db
    .select({
      id: roadmapSubtopics.id,
      subtopicId: roadmapSubtopics.subtopicId,
      title: roadmapSubtopics.title,
    })
    .from(roadmapSubtopics)
    .where(inArray(roadmapSubtopics.subtopicId, affectedSubtopics));

  for (const rs of rsRows) {
    if (!rs.subtopicId) continue;
    const [totalRow, solvedRow] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(problems)
        .where(eq(problems.subtopicId, rs.subtopicId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(userProblems)
        .innerJoin(problems, eq(userProblems.problemId, problems.id))
        .where(
          and(
            eq(userProblems.userId, userId),
            eq(problems.subtopicId, rs.subtopicId)
          )
        ),
    ]);
    const total = totalRow[0]?.count ?? 0;
    const solved = solvedRow[0]?.count ?? 0;
    if (total === 0) continue;

    const progress = percentage(solved, total);
    const status =
      progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started";

    await db
      .insert(userRoadmapProgress)
      .values({
        userId,
        roadmapSubtopicId: rs.id,
        status,
        progress,
      })
      .onConflictDoUpdate({
        target: [
          userRoadmapProgress.userId,
          userRoadmapProgress.roadmapSubtopicId,
        ],
        set: { status, progress, updatedAt: new Date() },
      });

    if (progress >= 100) {
      await notifyRoadmapMilestone(userId, rs.title, rs.id);
    }
  }
}

export async function updateRoadmapProgress(
  userId: string,
  input: {
    roadmapSubtopicId: string;
    status?: "not_started" | "in_progress" | "completed";
    progress?: number;
  }
): Promise<typeof userRoadmapProgress.$inferSelect> {
  const rs = await db
    .select({ id: roadmapSubtopics.id })
    .from(roadmapSubtopics)
    .where(eq(roadmapSubtopics.id, input.roadmapSubtopicId))
    .limit(1);
  if (rs.length === 0) {
    throw new AppError("INVALID_INPUT", "Unknown roadmap subtopic");
  }

  const existing = await db
    .select()
    .from(userRoadmapProgress)
    .where(
      and(
        eq(userRoadmapProgress.userId, userId),
        eq(userRoadmapProgress.roadmapSubtopicId, input.roadmapSubtopicId)
      )
    )
    .limit(1);

  const status =
    input.status ??
    (input.progress !== undefined
      ? input.progress >= 100
        ? "completed"
        : input.progress > 0
          ? "in_progress"
          : "not_started"
      : existing[0]?.status ?? "not_started");
  const progress = input.progress ?? existing[0]?.progress ?? 0;

  const rows = await db
    .insert(userRoadmapProgress)
    .values({
      userId,
      roadmapSubtopicId: input.roadmapSubtopicId,
      status,
      progress,
    })
    .onConflictDoUpdate({
      target: [
        userRoadmapProgress.userId,
        userRoadmapProgress.roadmapSubtopicId,
      ],
      set: { status, progress, updatedAt: new Date() },
    })
    .returning();

  return rows[0];
}

// Initialize roadmap progress rows for a new user (all not_started).
export async function initializeRoadmapProgress(userId: string): Promise<void> {
  const rsRows = await db
    .select({ id: roadmapSubtopics.id })
    .from(roadmapSubtopics);
  if (rsRows.length === 0) return;
  await db
    .insert(userRoadmapProgress)
    .values(
      rsRows.map((rs) => ({
        userId,
        roadmapSubtopicId: rs.id,
        status: "not_started" as const,
        progress: 0,
      }))
    )
    .onConflictDoNothing({
      target: [
        userRoadmapProgress.userId,
        userRoadmapProgress.roadmapSubtopicId,
      ],
    });
}
