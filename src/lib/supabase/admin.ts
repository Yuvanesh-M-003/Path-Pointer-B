// Privileged, server-only data access.
//
// In production this would be the Supabase service-role client, used ONLY for
// trusted server operations that must bypass RLS. It must never be imported
// into client components and never expose the service-role key to the browser.
//
// In this sandbox, all privileged data access happens through the Drizzle `db`
// client (server-only). We re-export it here so the intent ("privileged
// server-side data access") is explicit and centralized.

import "server-only";
import { db } from "@/db";

// Guard against accidental client bundling of the service-role key.
export function getServiceRoleKey(): string | undefined {
  if (typeof window !== "undefined") {
    throw new Error("Service-role key must never be accessed on the client.");
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export const adminDb = db;
