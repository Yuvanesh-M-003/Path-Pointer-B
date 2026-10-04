import { withAuth } from "@/lib/api/handler";
import { ok, handleError } from "@/lib/utils/response";
import { AppError } from "@/lib/utils/errors";
import { uuidSchema } from "@/lib/validation/common";
import { markNotificationRead } from "@/lib/engines/notifications";
import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) { return corsPreflightResponse(request); }

export const dynamic = "force-dynamic";

// PATCH /api/notifications/[id]/read — mark one notification read (own only).
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = uuidSchema.parse(id);
    return withAuth(_req, async ({ userId }) => {
      const updated = await markNotificationRead(userId, notificationId);
      if (!updated) {
        throw new AppError("NOTIFICATION_NOT_FOUND", "Notification not found");
      }
      return ok(updated);
    });
  } catch (err) {
    return handleError(err);
  }
}
