// Weak topic engine.
//
// Ranks topics from weakest to strongest using mastery, self-assessment, recent
// activity, and coverage. Returns a ranked list with a human-readable reason.

import { getStoredMastery } from "./mastery";
import type { WeakTopic } from "@/lib/types";

interface RankedTopic extends WeakTopic {
  weaknessScore: number;
}

export async function getWeakTopics(
  userId: string,
  limit = 5
): Promise<WeakTopic[]> {
  const mastery = await getStoredMastery(userId);
  if (mastery.length === 0) return [];

  const ranked: RankedTopic[] = mastery.map((m) => {
    // Lower mastery, lower self-assessment, lower coverage, lower consistency
    // all increase weakness. Weighted toward objective mastery.
    const weaknessScore =
      (100 - m.mastery) * 0.5 +
      (100 - m.selfAssessmentScore) * 0.2 +
      (100 - m.coverageScore) * 0.2 +
      (100 - m.consistencyScore) * 0.1;

    const reasons: string[] = [];
    if (m.mastery < 40) reasons.push("Low mastery");
    if (m.coverageScore < 30) reasons.push("insufficient coverage");
    if (m.consistencyScore < 25) reasons.push("low recent activity");
    if (m.selfAssessmentScore < 40) reasons.push("low self-assessment");
    const reason =
      reasons.length > 0
        ? capitalize(reasons.join(", "))
        : "Room to strengthen this topic";

    return {
      topicId: m.topicId,
      topic: m.topicName,
      mastery: m.mastery,
      reason,
      weaknessScore,
    };
  });

  ranked.sort((a, b) => b.weaknessScore - a.weaknessScore);

  return ranked.slice(0, limit).map(({ ...rest }) => ({
    topicId: rest.topicId,
    topic: rest.topic,
    mastery: rest.mastery,
    reason: rest.reason,
  }));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
