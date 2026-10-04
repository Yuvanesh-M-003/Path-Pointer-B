import { corsPreflightResponse } from "@/lib/api/cors";
import { withOnboardedAuth } from "@/lib/api/handler";
import { ok, created, deserializeFromClient } from "@/lib/utils/response";
import { createGoalSchema } from "@/lib/validation/goals";
import { listGoalsWithProgress, createGoal } from "@/lib/engines/goalsCrud";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/goals — list the user's goals with fresh progress.
export async function GET(request: Request) {
  return withOnboardedAuth(request, async ({ userId }) => {
    const goals = await listGoalsWithProgress(userId);
    return ok({ goals });
  });
}

// POST /api/goals — create a goal.
export async function POST(req: Request) {
  return withOnboardedAuth(async ({ userId }) => {
    const body = await req.json().catch(() => ({}));
    const input = createGoalSchema.parse(deserializeFromClient(body));
    const goal = await createGoal(userId, input);
    return created(goal);
  });
}
