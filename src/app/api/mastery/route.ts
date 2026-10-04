import { withOnboardedAuth } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import {
  getStoredMastery,
  calculateAllTopicMastery,
} from "@/lib/engines/mastery";

import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/mastery — stored topic mastery for the user.
export async function GET(request: Request) {
  return withOnboardedAuth(request, async ({ userId }) => {
    const mastery = await getStoredMastery(userId);
    return ok({ mastery });
  });
}

// POST /api/mastery — force a full recalculation, then return results.
export async function POST(request: Request) {
  return withOnboardedAuth(request, async ({ userId }) => {
    await calculateAllTopicMastery(userId);
    const mastery = await getStoredMastery(userId);
    return ok({ mastery });
  });
}
