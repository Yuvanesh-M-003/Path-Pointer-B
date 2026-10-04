// Browser-side Supabase client factory.
//
// In production this returns a Supabase browser client used for auth flows
// (Google OAuth sign-in) from client components. It must ONLY use the public
// anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY), never the service-role key.
//
// In this sandbox we do not ship a real Supabase client; the config values are
// read from public env vars so the shape matches production. Data access from
// the browser always goes through the backend API routes, never directly to the
// database.

export interface PublicSupabaseConfig {
  url: string | undefined;
  anonKey: string | undefined;
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
