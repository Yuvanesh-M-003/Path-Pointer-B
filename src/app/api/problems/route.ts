import { withAuth, enforceRateLimit } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import { problemFiltersSchema } from "@/lib/validation/problems";
import { listProblems } from "@/lib/engines/problems";

import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/problems — filter/search/paginate the problem catalog.
export async function GET(req: Request) {
  return withAuth(req, async ({ userId }) => {
    enforceRateLimit(userId, "problems-search", 60, 60_000);
    const { searchParams } = new URL(req.url);
    const filters = problemFiltersSchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const result = await listProblems(userId, filters);
    return ok(result);
  });
}
