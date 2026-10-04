import { withOnboardedAuth } from "@/lib/api/handler";
import { ok, handleError, deserializeFromClient } from "@/lib/utils/response";
import { uuidSchema } from "@/lib/validation/common";
import { updateGoalSchema } from "@/lib/validation/goals";
import { updateGoal } from "@/lib/engines/goalsCrud";
import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) { return corsPreflightResponse(request); }

export const dynamic = "force-dynamic";

// PATCH /api/goals/[id] — update a goal owned by the authenticated user.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const goalId = uuidSchema.parse(id);
    const body = await req.json().catch(() => ({}));
    const input = updateGoalSchema.parse(deserializeFromClient(body));
    return withOnboardedAuth(req, async ({ userId }) => {
      const goal = await updateGoal(userId, goalId, input);
      return ok(goal);
    });
  } catch (err) {
    return handleError(err);
  }
}
