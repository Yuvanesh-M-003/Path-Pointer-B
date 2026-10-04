// Shared API-facing types. Database row types are re-exported from the Drizzle
// schema so there is a single source of truth.

export type {
  Profile,
  UserSolvedBaseline,
  Topic,
  Subtopic,
  Problem,
  Top150Problem,
  UserTopicRating,
  UserProblem,
  DailyProgress,
  Goal,
  Recommendation,
  TopicMastery,
  RoadmapTopic,
  RoadmapSubtopic,
  UserRoadmapProgress,
  Notification,
} from "@/db/schema";

export interface AuthUser {
  authUserId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface SolvedStats {
  baseline: { easy: number; medium: number; hard: number; total: number };
  tracked: { easy: number; medium: number; hard: number; total: number };
  total: { easy: number; medium: number; hard: number; overall: number };
}

export interface DailyProgressView {
  date: string;
  solvedCount: number;
  dailyGoal: number;
  completed: boolean;
  remaining: number;
}

export interface TopicMasteryView {
  topicId: string;
  topicName: string;
  mastery: number;
  coverageScore: number;
  difficultyScore: number;
  consistencyScore: number;
  selfAssessmentScore: number;
  solvedCount: number;
}

export interface WeakTopic {
  topicId: string;
  topic: string;
  mastery: number;
  reason: string;
}

export interface RecommendationView {
  id: string;
  problemId: string;
  topicId: string;
  topic: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  url: string | null;
  reason: string | null;
  score: number;
  status: "pending" | "completed" | "dismissed";
}

export interface HeatmapPoint {
  date: string;
  count: number;
}
