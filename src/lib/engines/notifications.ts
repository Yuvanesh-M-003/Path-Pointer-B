// Notification engine (in-app only; no email).
//
// Notifications are deduplicated via a per-user `dedupeKey` so repeated API
// calls / repeated events do not spam the user.

import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications, type Notification } from "@/db/schema";

type NotificationType = Notification["type"];

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}

// Creates a notification unless one with the same (userId, dedupeKey) exists.
// Returns the created notification, or null if it was deduplicated.
export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification | null> {
  const rows = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata ?? null,
      dedupeKey: input.dedupeKey ?? null,
    })
    .onConflictDoNothing({
      target: [notifications.userId, notifications.dedupeKey],
    })
    .returning();
  return rows[0] ?? null;
}

export async function getNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {}
): Promise<Notification[]> {
  const limit = Math.min(opts.limit ?? 50, 100);
  const where = opts.unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.read, false))
    : eq(notifications.userId, userId);

  return db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows[0]?.count ?? 0;
}

// Marks a single notification read. Returns null if not found / not owned.
export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<Notification | null> {
  const rows = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    )
    .returning();
  return rows[0] ?? null;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const rows = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .returning({ id: notifications.id });
  return rows.length;
}

// --- Milestone helpers used by the solve pipeline ---

export async function notifyDailyGoalCompleted(
  userId: string,
  date: string,
  goal: number
): Promise<void> {
  await createNotification({
    userId,
    type: "daily_goal_completed",
    title: "Daily goal complete! 🎯",
    message: `You hit your daily goal of ${goal} problems.`,
    metadata: { date, goal },
    dedupeKey: `daily_goal:${date}`,
  });
}

export async function notifyStreakMilestone(
  userId: string,
  streak: number
): Promise<void> {
  const milestones = [3, 7, 14, 30, 60, 100, 180, 365];
  if (!milestones.includes(streak)) return;
  await createNotification({
    userId,
    type: "streak_milestone",
    title: `🔥 ${streak}-day streak!`,
    message: `You've solved problems ${streak} days in a row. Keep it going!`,
    metadata: { streak },
    dedupeKey: `streak:${streak}`,
  });
}

export async function notifyTop150Milestone(
  userId: string,
  solved: number,
  total: number
): Promise<void> {
  const pct = total ? Math.floor((solved / total) * 100) : 0;
  const milestones = [25, 50, 75, 100];
  const hit = milestones.find((m) => pct >= m && pct < m + 5);
  if (hit === undefined) return;
  await createNotification({
    userId,
    type: "top150_milestone",
    title: `Top 150: ${hit}% complete`,
    message: `You've solved ${solved} of ${total} Top 150 problems.`,
    metadata: { solved, total, pct },
    dedupeKey: `top150:${hit}`,
  });
}

export async function notifyRoadmapMilestone(
  userId: string,
  subtopicTitle: string,
  roadmapSubtopicId: string
): Promise<void> {
  await createNotification({
    userId,
    type: "roadmap_milestone",
    title: "Roadmap module complete ✅",
    message: `You completed "${subtopicTitle}" on your roadmap.`,
    metadata: { roadmapSubtopicId },
    dedupeKey: `roadmap:${roadmapSubtopicId}`,
  });
}
