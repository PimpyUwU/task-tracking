import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client for trusted server-side contexts (Paddle
 * webhooks). It bypasses RLS, so it must NEVER be imported into anything that
 * runs with a user session or reaches the browser.
 *
 * Env-gated: returns null when `SUPABASE_SERVICE_ROLE_KEY` is absent so the
 * webhook can no-op cleanly before Paddle keys are provisioned, rather than
 * throwing at import time.
 */
export function createAdminClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
