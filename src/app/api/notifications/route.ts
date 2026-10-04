import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import { getNotifications, getUnreadCount } from "@/lib/engines/notifications";

import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/notifications — the authenticated user's notifications.
// Query: ?unread=true limits to unread; ?limit=N (max 100).
export async function GET(req: Request) {
  return withAuth(req, async ({ userId }) => {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(userId, { unreadOnly, limit }),
      getUnreadCount(userId),
    ]);
    return ok({ notifications, unreadCount });
  });
}
