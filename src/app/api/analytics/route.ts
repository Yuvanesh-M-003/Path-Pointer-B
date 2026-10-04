import { withOnboardedAuth } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import { getAnalytics } from "@/lib/engines/analytics";
import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/analytics — analytics payload for the frontend dashboard.
export async function GET(req: Request) {
  return withOnboardedAuth(req, async ({ userId }) => {
    const timezone =
      new URL(req.url).searchParams.get("timezone") ?? undefined;
    const data = await getAnalytics(userId, timezone);
    return ok(data);
  });
}
