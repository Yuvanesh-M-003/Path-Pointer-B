import { withOnboardedAuth } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import { getTop150 } from "@/lib/engines/top150";

import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/top150 — Top 150 collection with derived solved status & progress.
export async function GET(request: Request) {
  return withOnboardedAuth(request, async ({ userId }) => {
    const data = await getTop150(userId);
    return ok(data);
  });
}
