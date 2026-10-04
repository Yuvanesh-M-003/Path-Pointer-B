import { createSupabaseServerClient } from "@/lib/supabase/server";

import { corsPreflightResponse } from "@/lib/api/cors";

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) {
      return Response.json(
        {
          ok: false,
          database: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      database: true,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}