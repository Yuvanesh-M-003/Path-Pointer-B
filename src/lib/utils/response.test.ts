import { describe, expect, it } from "vitest";
import { deserializeFromClient, serializeForClient } from "./response";

describe("deserializeFromClient", () => {
  it("recursively converts snake_case keys to camelCase", () => {
    const result = deserializeFromClient({
      full_name: "Alice Example",
      topic_ratings: [{ topic_id: "topic-123", rating: 8 }],
      active: true,
    });

    expect(result).toEqual({
      fullName: "Alice Example",
      topicRatings: [{ topicId: "topic-123", rating: 8 }],
      active: true,
    });
  });
});

describe("serializeForClient", () => {
  it("recursively converts camelCase keys to snake_case", () => {
    const result = serializeForClient({
      avatarUrl: "https://example.com/avatar.png",
      onboardingCompleted: true,
      leetcodeUsername: "alice",
      profile: {
        fullName: "Alice Example",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
      topics: [{ roadmapSubtopicId: "subtopic-123" }],
    });

    expect(result).toEqual({
      avatar_url: "https://example.com/avatar.png",
      onboarding_completed: true,
      leetcode_username: "alice",
      profile: {
        full_name: "Alice Example",
        created_at: "2024-01-01T00:00:00.000Z",
      },
      topics: [{ roadmap_subtopic_id: "subtopic-123" }],
    });
  });
});
