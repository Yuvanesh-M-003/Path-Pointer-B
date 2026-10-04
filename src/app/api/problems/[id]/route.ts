import { withAuth } from "@/lib/api/handler";
import { ok, handleError } from "@/lib/utils/response";
import { AppError } from "@/lib/utils/errors";
import { uuidSchema } from "@/lib/validation/common";
import { getProblemById } from "@/lib/engines/problems";
import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) { return corsPreflightResponse(request); }

export const dynamic = "force-dynamic";

// GET /api/problems/[id] — a single problem with solved state.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const problemId = uuidSchema.parse(id);
    return withAuth(_req, async ({ userId }) => {
      const problem = await getProblemById(userId, problemId);
      if (!problem) throw new AppError("PROBLEM_NOT_FOUND", "Problem not found");
      return ok(problem);
    });
  } catch (err) {
    return handleError(err);
  }
}
