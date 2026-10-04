import { corsPreflightResponse } from "@/lib/api/cors";
import { withAuth } from "@/lib/api/handler";
import { created, deserializeFromClient } from "@/lib/utils/response";
import { onboardingSchema } from "@/lib/validation/onboarding";
import { runOnboarding } from "@/lib/engines/onboarding";
import { getProfileView } from "@/lib/engines/profile";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

// POST /api/onboarding — safely repeatable onboarding.
export async function POST(req: Request) {
  return withAuth(req, async ({ profile }) => {
    const body = await req.json().catch(() => ({}));
    const input = onboardingSchema.parse(deserializeFromClient(body));
    const updated = await runOnboarding(profile, input);
    const view = await getProfileView(updated);
    return created(view);
  });
}
