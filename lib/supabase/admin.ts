import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for trusted server-side jobs (cron, scripts).
 * Bypasses RLS — there is no user session — so it must ONLY be used from
 * server code that is itself protected (e.g. the CRON_SECRET-gated route).
 * Never import this into a client component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "createAdminClient: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
