import { corsPreflightResponse } from "@/lib/api/cors";
import { withAuth } from "@/lib/api/handler";
import { ok, deserializeFromClient } from "@/lib/utils/response";
import { getProfileView, updateProfile } from "@/lib/engines/profile";
import { updateProfileSchema } from "@/lib/validation/profile";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// GET /api/profile — returns the authenticated user's profile + baseline + ratings.
export async function GET(request: Request) {
  return withAuth(request, async ({ profile }) => {
    const view = await getProfileView(profile);
    return ok(view);
  });
}

// PATCH /api/profile — update editable fields only.
export async function PATCH(request: Request) {
  return withAuth(request, async ({ profile }) => {
    const body = await request.json().catch(() => ({}));
    const input = updateProfileSchema.parse(deserializeFromClient(body));
    const updated = await updateProfile(profile, input);
    const view = await getProfileView(updated);
    return ok(view);
  });
}
