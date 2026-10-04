import { withOnboardedAuth } from "@/lib/api/handler";
import { ok, deserializeFromClient } from "@/lib/utils/response";
import { updateRoadmapSchema } from "@/lib/validation/roadmap";
import {
  getRoadmap,
  updateRoadmapProgress,
} from "@/lib/engines/roadmap";

import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/roadmap — roadmap definition + user progress + completion.
export async function GET(request: Request) {
  return withOnboardedAuth(request, async ({ userId }) => {
    const roadmap = await getRoadmap(userId);
    return ok(roadmap);
  });
}

// PATCH /api/roadmap — manually update the user's progress for a subtopic.
export async function PATCH(req: Request) {
  return withOnboardedAuth(async ({ userId }) => {
    const body = await req.json().catch(() => ({}));
    const input = updateRoadmapSchema.parse(deserializeFromClient(body));
    const row = await updateRoadmapProgress(userId, input);
    return ok(row);
  });
}
