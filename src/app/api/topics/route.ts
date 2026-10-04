import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import { getTopics } from "@/lib/engines/topics";

import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/topics — read-only reference data (topics + subtopics), cached.
export async function GET(request: Request) {
  return withAuth(request, async () => {
    const topics = await getTopics();
    return ok({ topics });
  });
}
