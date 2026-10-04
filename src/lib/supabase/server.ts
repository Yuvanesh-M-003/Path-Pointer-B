import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getBearerToken(request?: Request) {
  const header = request?.headers.get("authorization");
  if (!header) return undefined;
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function createSupabaseServerClient(request?: Request) {
  const cookieStore = await cookies();
  const bearerToken = getBearerToken(request);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: bearerToken
        ? {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          }
        : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components may not allow setting cookies.
          }
        },
      },
    }
  );
}

export async function getServerAuthUser(request?: Request) {
  const supabase = await createSupabaseServerClient(request);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    authUserId: user.id,
    email: user.email ?? `${user.id}@placeholder.local`,
    name:
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      null,
    avatarUrl:
      user.user_metadata?.avatar_url ??
      user.user_metadata?.picture ??
      null,
  };
}