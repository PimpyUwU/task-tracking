import type { Supabase } from "@/lib/invoice";

/**
 * Aggregated billing metrics for the Overview hero. All money is derived from
 * the layered effective rate (project.rate ?? client.default_rate ?? 0) applied
 * to billable seconds. Weeks are Monday-based, computed in UTC.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export type OverviewMetrics = {
  currency: string;
  thisWeek: { billableSeconds: number; nonBillableSeconds: number; earnings: number };
  lastWeek: { earnings: number };
  deltaPct: number | null;
  daily: number[]; // 7 earnings buckets, Mon → Sun of the current week
  unbilled: { total: number; clients: number };
};

function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay(); // 0 = Sun
  const sinceMon = (day + 6) % 7;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - sinceMon),
  );
}

export async function getOverviewMetrics(
  supabase: Supabase,
): Promise<OverviewMetrics> {
  // Effective rate + currency per project.
  const { data: projects } = await supabase
    .from("projects")
    .select("id, rate, client_id, clients(default_rate, currency)");

  const rateByProject = new Map<string, number>();
  const clientByProject = new Map<string, string | null>();
  let currency = "USD";
  for (const p of projects ?? []) {
    const client = (Array.isArray(p.clients) ? p.clients[0] : p.clients) as
      | { default_rate: number | null; currency: string }
      | null
      | undefined;
    rateByProject.set(p.id, p.rate ?? client?.default_rate ?? 0);
    clientByProject.set(p.id, p.client_id);
    if (client?.currency) currency = client.currency;
  }

  const now = new Date();
  const startThis = startOfWeekUTC(now);
  const startLast = new Date(startThis);
  startLast.setUTCDate(startThis.getUTCDate() - 7);

  // Entries across the current + previous week for hero + sparkline.
  const { data: recent } = await supabase
    .from("time_entries")
    .select("duration_seconds, started_at, is_billable, tasks!inner(project_id)")
    .gte("started_at", startLast.toISOString())
    .not("ended_at", "is", null);

  const thisWeek = { billableSeconds: 0, nonBillableSeconds: 0, earnings: 0 };
  const lastWeek = { earnings: 0 };
  const daily = [0, 0, 0, 0, 0, 0, 0];

  for (const e of recent ?? []) {
    const task = (Array.isArray(e.tasks) ? e.tasks[0] : e.tasks) as
      | { project_id: string }
      | undefined;
    const rate = task ? (rateByProject.get(task.project_id) ?? 0) : 0;
    const seconds = e.duration_seconds ?? 0;
    const started = new Date(e.started_at);
    const money = e.is_billable ? (seconds / 3600) * rate : 0;

    if (started >= startThis) {
      if (e.is_billable) {
        thisWeek.billableSeconds += seconds;
        thisWeek.earnings += money;
      } else {
        thisWeek.nonBillableSeconds += seconds;
      }
      const bucket = Math.min(
        6,
        Math.floor((started.getTime() - startThis.getTime()) / 86400000),
      );
      if (bucket >= 0) daily[bucket] += money;
    } else if (e.is_billable) {
      lastWeek.earnings += money;
    }
  }

  // Unbilled billable time (all-time, not yet on an invoice).
  const { data: unbilledEntries } = await supabase
    .from("time_entries")
    .select("duration_seconds, tasks!inner(project_id)")
    .eq("is_billable", true)
    .is("invoice_id", null)
    .not("ended_at", "is", null);

  let unbilledTotal = 0;
  const unbilledClients = new Set<string>();
  for (const e of unbilledEntries ?? []) {
    const task = (Array.isArray(e.tasks) ? e.tasks[0] : e.tasks) as
      | { project_id: string }
      | undefined;
    if (!task) continue;
    const rate = rateByProject.get(task.project_id) ?? 0;
    const money = ((e.duration_seconds ?? 0) / 3600) * rate;
    unbilledTotal += money;
    const clientId = clientByProject.get(task.project_id);
    if (clientId && money > 0) unbilledClients.add(clientId);
  }

  const deltaPct =
    lastWeek.earnings > 0
      ? ((thisWeek.earnings - lastWeek.earnings) / lastWeek.earnings) * 100
      : null;

  return {
    currency,
    thisWeek: {
      billableSeconds: thisWeek.billableSeconds,
      nonBillableSeconds: thisWeek.nonBillableSeconds,
      earnings: round2(thisWeek.earnings),
    },
    lastWeek: { earnings: round2(lastWeek.earnings) },
    deltaPct,
    daily: daily.map(round2),
    unbilled: { total: round2(unbilledTotal), clients: unbilledClients.size },
  };
}
