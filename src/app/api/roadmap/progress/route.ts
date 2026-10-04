import { withOnboardedAuth } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import { z } from "zod";
import { updateRoadmapProgress } from "@/lib/engines/roadmap";
import { AppError } from "@/lib/utils/errors";
import { deserializeFromClient } from "@/lib/utils/response";
import { corsPreflightResponse } from "@/lib/api/cors";

const roadmapProgressBodySchema = z
  .object({
    roadmap_topic_id: z.string().uuid().optional(),
    roadmap_subtopic_id: z.string().uuid().optional(),
    roadmapTopicId: z.string().uuid().optional(),
    roadmapSubtopicId: z.string().uuid().optional(),
    status: z.enum(["not_started", "in_progress", "completed"]).optional(),
    progress: z.coerce.number().min(0).max(100).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.roadmap_subtopic_id) ||
      Boolean(value.roadmapSubtopicId) ||
      Boolean(value.roadmap_topic_id) ||
      Boolean(value.roadmapTopicId),
    {
      message: "roadmap topic/subtopic id is required",
    }
  );

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withOnboardedAuth(req, async ({ userId }) => {
    const body = await req.json().catch(() => ({}));
    const input = roadmapProgressBodySchema.parse(deserializeFromClient(body));
    const roadmapSubtopicId =
      input.roadmap_subtopic_id ??
      input.roadmapSubtopicId ??
      input.roadmap_topic_id ??
      input.roadmapTopicId;

    if (!roadmapSubtopicId) {
      throw new AppError("INVALID_INPUT", "roadmap_subtopic_id is required");
    }

    await updateRoadmapProgress(userId, {
      roadmapSubtopicId,
      status: input.status,
      progress: input.progress,
    });
    return ok({ ok: true });
  });
}
