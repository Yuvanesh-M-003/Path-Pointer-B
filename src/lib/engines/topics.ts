// Topics + subtopics reference data. This changes infrequently, so it is cached
// in-process with a short TTL to avoid repeated DB hits.

import { db } from "@/db";
import { topics, subtopics } from "@/db/schema";

export interface SubtopicView {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
}

export interface TopicView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  subtopics: SubtopicView[];
}

let cache: { data: TopicView[]; expiresAt: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function getTopics(): Promise<TopicView[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const [topicRows, subRows] = await Promise.all([
    db.select().from(topics).orderBy(topics.displayOrder),
    db.select().from(subtopics).orderBy(subtopics.displayOrder),
  ]);

  const subsByTopic = new Map<string, SubtopicView[]>();
  for (const s of subRows) {
    const list = subsByTopic.get(s.topicId) ?? [];
    list.push({
      id: s.id,
      name: s.name,
      slug: s.slug,
      displayOrder: s.displayOrder,
    });
    subsByTopic.set(s.topicId, list);
  }

  const data: TopicView[] = topicRows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    displayOrder: t.displayOrder,
    subtopics: subsByTopic.get(t.id) ?? [],
  }));

  cache = { data, expiresAt: Date.now() + TTL_MS };
  return data;
}

export function invalidateTopicsCache(): void {
  cache = null;
}
