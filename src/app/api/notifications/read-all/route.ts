import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/utils/response";
import { markAllNotificationsRead } from "@/lib/engines/notifications";

import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// PATCH /api/notifications/read-all — mark all of the user's notifications read.
export async function PATCH(request: Request) {
  return withAuth(request, async ({ userId }) => {
    const updated = await markAllNotificationsRead(userId);
    return ok({ updated });
  });
}
