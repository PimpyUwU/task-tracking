import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Minimal funnel instrumentation (Epic G1). Four events matter for the
 * 2-month go/no-go: `signup`, `activation` (first billable entry),
 * `invoice_generated`, `upgrade`. Rows land in `public.analytics_events`;
 * counts are read with plain SQL (no dashboards/BI).
 *
 * Tracking must NEVER break a user flow — every call swallows its own errors.
 */

type Supabase = SupabaseClient<Database>;

export type FunnelEvent =
  | "signup"
  | "activation"
  | "invoice_generated"
  | "upgrade";

/** Fire-and-forget: record one event for the current user. Errors are swallowed. */
export async function track(
  supabase: Supabase,
  event: FunnelEvent,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase
      .from("analytics_events")
      .insert({ event, props: (props ?? null) as never });
  } catch {
    // Analytics is best-effort; never surface to the caller.
  }
}

/**
 * Record a singleton event at most once per user (used for `activation`, which
 * is defined as the user's FIRST billable entry). Cheap indexed existence check
 * on (user_id, event); skips the insert if already present.
 */
export async function trackOnce(
  supabase: Supabase,
  userId: string,
  event: FunnelEvent,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    const { count } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event", event);
    if ((count ?? 0) > 0) return;
    await supabase
      .from("analytics_events")
      .insert({ user_id: userId, event, props: (props ?? null) as never });
  } catch {
    // Best-effort.
  }
}
