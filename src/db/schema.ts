// Path Pointer database schema (Drizzle ORM / PostgreSQL)
//
// This mirrors the existing 16-table Supabase schema. In the sandbox we run
// against a local PostgreSQL instance, but the table shapes, relationships,
// and constraints match the production Supabase design.
//
// Auth model: `profiles.auth_user_id` references the external auth provider's
// user id (in production this is `auth.users.id` from Supabase Auth). The
// backend NEVER trusts a user id from the request body; it always derives the
// application user id (`profiles.id`) from the authenticated session.

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  real,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const difficultyEnum = pgEnum("difficulty", ["Easy", "Medium", "Hard"]);
export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "pending",
  "completed",
  "dismissed",
]);
export const roadmapProgressStatusEnum = pgEnum("roadmap_progress_status", [
  "not_started",
  "in_progress",
  "completed",
]);
export const goalTypeEnum = pgEnum("goal_type", ["daily", "weekly", "custom"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "daily_goal_completed",
  "new_recommendation",
  "weak_topic",
  "streak_milestone",
  "top150_milestone",
  "roadmap_milestone",
  "generic",
]);

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: text("auth_user_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    leetcodeUsername: text("leetcode_username"),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    authUserIdx: uniqueIndex("profiles_auth_user_id_key").on(t.authUserId),
    emailIdx: index("profiles_email_idx").on(t.email),
  })
);

// ---------------------------------------------------------------------------
// user_solved_baseline
// ---------------------------------------------------------------------------

export const userSolvedBaseline = pgTable(
  "user_solved_baseline",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    easySolved: integer("easy_solved").notNull().default(0),
    mediumSolved: integer("medium_solved").notNull().default(0),
    hardSolved: integer("hard_solved").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: uniqueIndex("user_solved_baseline_user_id_key").on(t.userId),
  })
);

// ---------------------------------------------------------------------------
// topics
// ---------------------------------------------------------------------------

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("topics_slug_key").on(t.slug),
    nameIdx: uniqueIndex("topics_name_key").on(t.name),
  })
);

// ---------------------------------------------------------------------------
// subtopics
// ---------------------------------------------------------------------------

export const subtopics = pgTable(
  "subtopics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    topicIdx: index("subtopics_topic_id_idx").on(t.topicId),
    slugIdx: uniqueIndex("subtopics_topic_slug_key").on(t.topicId, t.slug),
  })
);

// ---------------------------------------------------------------------------
// problems
// ---------------------------------------------------------------------------

export const problems = pgTable(
  "problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    subtopicId: uuid("subtopic_id").references(() => subtopics.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    url: text("url"),
    externalId: text("external_id"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("problems_slug_key").on(t.slug),
    topicIdx: index("problems_topic_id_idx").on(t.topicId),
    subtopicIdx: index("problems_subtopic_id_idx").on(t.subtopicId),
    difficultyIdx: index("problems_difficulty_idx").on(t.difficulty),
  })
);

// ---------------------------------------------------------------------------
// top_150_problems
// ---------------------------------------------------------------------------

export const top150Problems = pgTable(
  "top_150_problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id").references(() => problems.id, {
      onDelete: "set null",
    }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    url: text("url"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("top_150_problems_slug_key").on(t.slug),
    topicIdx: index("top_150_problems_topic_id_idx").on(t.topicId),
    problemIdx: index("top_150_problems_problem_id_idx").on(t.problemId),
  })
);

// ---------------------------------------------------------------------------
// user_topic_ratings
// ---------------------------------------------------------------------------

export const userTopicRatings = pgTable(
  "user_topic_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 0-10 self assessment
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userTopicIdx: uniqueIndex("user_topic_ratings_user_topic_key").on(
      t.userId,
      t.topicId
    ),
    userIdx: index("user_topic_ratings_user_id_idx").on(t.userId),
  })
);

// ---------------------------------------------------------------------------
// user_problems  (tracked solves inside Path Pointer)
// ---------------------------------------------------------------------------

export const userProblems = pgTable(
  "user_problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    solvedAt: timestamp("solved_at", { withTimezone: true }).notNull().defaultNow(),
    // The local calendar day (user's day) the solve was recorded for.
    solvedDate: date("solved_date").notNull(),
    notes: text("notes"),
  },
  (t) => ({
    userProblemIdx: uniqueIndex("user_problems_user_problem_key").on(
      t.userId,
      t.problemId
    ),
    userIdx: index("user_problems_user_id_idx").on(t.userId),
    userDateIdx: index("user_problems_user_date_idx").on(t.userId, t.solvedDate),
  })
);

// ---------------------------------------------------------------------------
// daily_progress
// ---------------------------------------------------------------------------

export const dailyProgress = pgTable(
  "daily_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    progressDate: date("progress_date").notNull(),
    solvedCount: integer("solved_count").notNull().default(0),
    dailyGoal: integer("daily_goal").notNull().default(2),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userDateIdx: uniqueIndex("daily_progress_user_date_key").on(
      t.userId,
      t.progressDate
    ),
    userIdx: index("daily_progress_user_id_idx").on(t.userId),
  })
);

// ---------------------------------------------------------------------------
// goals
// ---------------------------------------------------------------------------

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: goalTypeEnum("type").notNull().default("daily"),
    title: text("title").notNull(),
    target: integer("target").notNull(),
    progress: integer("progress").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("goals_user_id_idx").on(t.userId),
  })
);

// ---------------------------------------------------------------------------
// recommendations
// ---------------------------------------------------------------------------

export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    reason: text("reason"),
    score: real("score").notNull().default(0),
    status: recommendationStatusEnum("status").notNull().default("pending"),
    recommendedDate: date("recommended_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    userDateProblemIdx: uniqueIndex("recommendations_user_date_problem_key").on(
      t.userId,
      t.recommendedDate,
      t.problemId
    ),
    userIdx: index("recommendations_user_id_idx").on(t.userId),
    userStatusIdx: index("recommendations_user_status_idx").on(t.userId, t.status),
  })
);

// ---------------------------------------------------------------------------
// topic_mastery
// ---------------------------------------------------------------------------

export const topicMastery = pgTable(
  "topic_mastery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    mastery: real("mastery").notNull().default(0), // 0-100
    coverageScore: real("coverage_score").notNull().default(0),
    difficultyScore: real("difficulty_score").notNull().default(0),
    consistencyScore: real("consistency_score").notNull().default(0),
    selfAssessmentScore: real("self_assessment_score").notNull().default(0),
    solvedCount: integer("solved_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userTopicIdx: uniqueIndex("topic_mastery_user_topic_key").on(
      t.userId,
      t.topicId
    ),
    userIdx: index("topic_mastery_user_id_idx").on(t.userId),
  })
);

// ---------------------------------------------------------------------------
// roadmap_topics
// ---------------------------------------------------------------------------

export const roadmapTopics = pgTable(
  "roadmap_topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id").references(() => topics.id, {
      onDelete: "set null",
    }),
    stage: integer("stage").notNull().default(1),
    title: text("title").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    stageIdx: index("roadmap_topics_stage_idx").on(t.stage),
    topicIdx: index("roadmap_topics_topic_id_idx").on(t.topicId),
  })
);

// ---------------------------------------------------------------------------
// roadmap_subtopics
// ---------------------------------------------------------------------------

export const roadmapSubtopics = pgTable(
  "roadmap_subtopics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roadmapTopicId: uuid("roadmap_topic_id")
      .notNull()
      .references(() => roadmapTopics.id, { onDelete: "cascade" }),
    subtopicId: uuid("subtopic_id").references(() => subtopics.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    roadmapTopicIdx: index("roadmap_subtopics_roadmap_topic_id_idx").on(
      t.roadmapTopicId
    ),
    subtopicIdx: index("roadmap_subtopics_subtopic_id_idx").on(t.subtopicId),
  })
);

// ---------------------------------------------------------------------------
// user_roadmap_progress
// ---------------------------------------------------------------------------

export const userRoadmapProgress = pgTable(
  "user_roadmap_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    roadmapSubtopicId: uuid("roadmap_subtopic_id")
      .notNull()
      .references(() => roadmapSubtopics.id, { onDelete: "cascade" }),
    status: roadmapProgressStatusEnum("status").notNull().default("not_started"),
    progress: real("progress").notNull().default(0), // 0-100
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userSubtopicIdx: uniqueIndex("user_roadmap_progress_user_subtopic_key").on(
      t.userId,
      t.roadmapSubtopicId
    ),
    userIdx: index("user_roadmap_progress_user_id_idx").on(t.userId),
  })
);

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull().default("generic"),
    title: text("title").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    read: boolean("read").notNull().default(false),
    // dedupeKey prevents generating duplicate notifications for the same event.
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("notifications_user_id_idx").on(t.userId),
    userReadIdx: index("notifications_user_read_idx").on(t.userId, t.read),
    dedupeIdx: uniqueIndex("notifications_user_dedupe_key")
      .on(t.userId, t.dedupeKey)
      .where(sql`dedupe_key IS NOT NULL`),
  })
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type UserSolvedBaseline = typeof userSolvedBaseline.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Subtopic = typeof subtopics.$inferSelect;
export type Problem = typeof problems.$inferSelect;
export type Top150Problem = typeof top150Problems.$inferSelect;
export type UserTopicRating = typeof userTopicRatings.$inferSelect;
export type UserProblem = typeof userProblems.$inferSelect;
export type DailyProgress = typeof dailyProgress.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type TopicMastery = typeof topicMastery.$inferSelect;
export type RoadmapTopic = typeof roadmapTopics.$inferSelect;
export type RoadmapSubtopic = typeof roadmapSubtopics.$inferSelect;
export type UserRoadmapProgress = typeof userRoadmapProgress.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
