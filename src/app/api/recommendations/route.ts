import { withOnboardedAuth, enforceRateLimit } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import {
  getRecommendations,
  generateRecommendations,
} from "@/lib/engines/recommendation";

import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/recommendations — today's recommendations (generates if none exist).
export async function GET(req: Request) {
  return withOnboardedAuth(req, async ({ userId }) => {
    const timezone =
      new URL(req.url).searchParams.get("timezone") ?? undefined;
    let recs = await getRecommendations(userId, timezone);
    if (recs.length === 0) {
      enforceRateLimit(userId, "recommendations-gen", 10, 60_000);
      recs = await generateRecommendations(userId, timezone);
    }
    return ok({ recommendations: recs });
  });
}

// POST /api/recommendations — force regeneration for today.
export async function POST(req: Request) {
  return withOnboardedAuth(req, async ({ userId }) => {
    enforceRateLimit(userId, "recommendations-gen", 10, 60_000);
    const timezone =
      new URL(req.url).searchParams.get("timezone") ?? undefined;
    const recs = await generateRecommendations(userId, timezone);
    return ok({ recommendations: recs });
  });
}
