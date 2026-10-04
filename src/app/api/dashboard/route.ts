import { withOnboardedAuth, enforceRateLimit } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import { getDashboard } from "@/lib/engines/dashboard";

import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/dashboard — single aggregated payload for the dashboard.
export async function GET(req: Request) {
  return withOnboardedAuth(req, async ({ profile, userId }) => {
    enforceRateLimit(userId, "dashboard", 30, 60_000);
    const timezone =
      new URL(req.url).searchParams.get("timezone") ?? undefined;
    const data = await getDashboard(profile, timezone);
    return ok(data);
  });
}
