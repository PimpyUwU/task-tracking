import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Supabase = SupabaseClient<Database>;

/** Free-tier ceilings (paid tier lifts these to Infinity). */
export const FREE_LIMITS = { clients: 5, projects: 5 } as const;

export type PlanTier = "free" | "paid";

export type Plan = {
  tier: PlanTier;
  /** Raw subscription status: 'free' | 'active' | 'past_due' | 'canceled'. */
  status: string;
  limits: { clients: number; projects: number };
  canInvoice: boolean;
  canExport: boolean;
  /** Pro-only "Advanced" surfaces: subtasks and custom invoice templates. */
  canUseAdvanced: boolean;
};

const PAID_PLAN: Plan = {
  tier: "paid",
  status: "active",
  limits: { clients: Infinity, projects: Infinity },
  canInvoice: true,
  canExport: true,
  canUseAdvanced: true,
};

/**
 * Resolve the current user's plan from their `subscriptions` row. RLS scopes the
 * row to the caller, so no explicit user filter is needed. A missing row (or any
 * non-'active' status) is treated as the free tier. Only status 'active' unlocks
 * the paid tier — 'past_due'/'canceled' fall back to free limits.
 */
export async function getPlan(supabase: Supabase): Promise<Plan> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .maybeSingle();

  const status = data?.status ?? "free";
  if (status === "active") return PAID_PLAN;

  return {
    tier: "free",
    status,
    limits: { clients: FREE_LIMITS.clients, projects: FREE_LIMITS.projects },
    canInvoice: false,
    canExport: false,
    canUseAdvanced: false,
  };
}

export type PlanUsage = {
  tier: PlanTier;
  status: string;
  clients: { used: number; limit: number };
  projects: { used: number; limit: number };
  canInvoice: boolean;
};

/**
 * Current counts against the plan ceilings — powers the Plan-page meters and the
 * inline counters near create actions (plan §9). Counts every row (archived
 * included) so the numbers match `assertWithinLimit`'s gate exactly. Paid tier
 * reports Infinity limits.
 */
export async function getPlanUsage(supabase: Supabase): Promise<PlanUsage> {
  const plan = await getPlan(supabase);
  const [{ count: clients }, { count: projects }] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
  ]);

  return {
    tier: plan.tier,
    status: plan.status,
    clients: { used: clients ?? 0, limit: plan.limits.clients },
    projects: { used: projects ?? 0, limit: plan.limits.projects },
    canInvoice: plan.canInvoice,
  };
}

/** Returns an `{ error }` to surface to the UI when the user can't invoice, else null. */
export async function assertCanInvoice(
  supabase: Supabase,
): Promise<{ error: string } | null> {
  const plan = await getPlan(supabase);
  return plan.canInvoice
    ? null
    : { error: "Invoicing is a paid feature. Upgrade to generate invoices." };
}

/** Returns an `{ error }` to surface to the UI when the user can't export, else null. */
export async function assertCanExport(
  supabase: Supabase,
): Promise<{ error: string } | null> {
  const plan = await getPlan(supabase);
  return plan.canExport
    ? null
    : { error: "Exporting is a paid feature. Upgrade to export your data." };
}

/**
 * Block a create when the user is already at their free-tier ceiling for the
 * given resource. Paid tier (Infinity limit) always passes. Returns `{ error }`
 * to return straight from a Server Action, else null.
 */
export async function assertWithinLimit(
  supabase: Supabase,
  resource: "clients" | "projects",
): Promise<{ error: string } | null> {
  const plan = await getPlan(supabase);
  const limit = plan.limits[resource];
  if (!Number.isFinite(limit)) return null;

  const { count } =
    resource === "clients"
      ? await supabase.from("clients").select("id", { count: "exact", head: true })
      : await supabase.from("projects").select("id", { count: "exact", head: true });

  if ((count ?? 0) >= limit) {
    return {
      error: `Free plan is limited to ${limit} ${resource}. Upgrade for unlimited.`,
    };
  }
  return null;
}
