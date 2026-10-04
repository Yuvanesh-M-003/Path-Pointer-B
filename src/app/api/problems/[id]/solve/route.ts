import { withOnboardedAuth } from "@/lib/api/handler";
import { ok, handleError, deserializeFromClient } from "@/lib/utils/response";
import { uuidSchema } from "@/lib/validation/common";
import { solveProblemSchema } from "@/lib/validation/problems";
import { solveProblem } from "@/lib/engines/solve";
import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) { return corsPreflightResponse(request); }

export const dynamic = "force-dynamic";

// POST /api/problems/[id]/solve — mark a problem solved (idempotent).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const problemId = uuidSchema.parse(id);
    const body = await req.json().catch(() => ({}));
    const parsed = solveProblemSchema.parse(deserializeFromClient(body)) ?? {};

    return withOnboardedAuth(req, async ({ userId }) => {
      const result = await solveProblem(userId, problemId, {
        notes: parsed.notes,
        timezone: parsed.timezone,
      });
      return ok(result, result.problemSolved ? 201 : 200);
    });
  } catch (err) {
    return handleError(err);
  }
}
