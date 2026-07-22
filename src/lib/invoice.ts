import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Invoicing domain logic shared by the server actions.
 *
 * Rate model (layered): a project's effective hourly rate is its own `rate`
 * when set, otherwise the client's `default_rate`, otherwise 0. The effective
 * rate is resolved here at draft time and snapshotted onto each line item so a
 * generated invoice never shifts when rates are later edited.
 */

export type Supabase = SupabaseClient<Database>;

export type InvoiceLineDraft = {
  taskId: string | null;
  description: string;
  hours: number; // 4dp, from summed billable seconds
  rate: number; // effective rate, snapshotted
  amount: number; // round(hours * rate, 2)
};

export type InvoiceTax = {
  label: string | null; // e.g. "VAT"; null when no tax configured
  rate: number; // percentage, e.g. 20 = 20%
  amount: number; // round2(subtotal * rate / 100)
};

export type InvoiceDraft = {
  client: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
    currency: string;
  };
  lines: InvoiceLineDraft[];
  subtotal: number;
  tax: InvoiceTax;
  total: number; // subtotal + tax.amount
  currency: string;
  billableHours: number; // sum of line hours
  entryIds: string[]; // entries to stamp on generate
  periodStart: string | null;
  periodEnd: string | null;
  /** Actual span of the selected entries (min/max started_at), for display. */
  coveredFrom: string | null;
  coveredTo: string | null;
};

export type DraftParams = {
  clientId: string;
  projectId?: string | null;
  periodStart?: string | null; // ISO date (inclusive)
  periodEnd?: string | null; // ISO date (inclusive)
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    // Unknown currency code — fall back to a plain number + code.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Collect billable, not-yet-invoiced, completed time entries for a client
 * (optionally one project, optionally a date window) and aggregate them into
 * one line item per task with the task's effective rate.
 */
export async function buildInvoiceDraft(
  supabase: Supabase,
  { clientId, projectId, periodStart, periodEnd }: DraftParams,
): Promise<{ draft: InvoiceDraft } | { error: string }> {
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, name, email, address, currency, default_rate, tax_label, tax_rate")
    .eq("id", clientId)
    .maybeSingle();

  if (clientErr) return { error: clientErr.message };
  if (!client) return { error: "Client not found." };

  // Projects belonging to this client (+ effective rate inputs).
  let projectQuery = supabase
    .from("projects")
    .select("id, name, rate")
    .eq("client_id", clientId);
  if (projectId) projectQuery = projectQuery.eq("id", projectId);

  const { data: projects, error: projErr } = await projectQuery;
  if (projErr) return { error: projErr.message };
  if (!projects || projects.length === 0) {
    return { error: "This client has no projects to invoice." };
  }

  const effectiveRate = new Map<string, number>(); // projectId -> rate
  const projectName = new Map<string, string>();
  for (const p of projects) {
    effectiveRate.set(p.id, p.rate ?? client.default_rate ?? 0);
    projectName.set(p.id, p.name);
  }

  // Tasks under those projects.
  const projectIds = projects.map((p) => p.id);
  const { data: tasks, error: taskErr } = await supabase
    .from("tasks")
    .select("id, name, project_id")
    .in("project_id", projectIds);
  if (taskErr) return { error: taskErr.message };

  const taskMeta = new Map<string, { name: string; projectId: string }>();
  for (const t of tasks ?? []) {
    taskMeta.set(t.id, { name: t.name, projectId: t.project_id });
  }
  const taskIds = [...taskMeta.keys()];
  if (taskIds.length === 0) {
    return { error: "No billable time available for this client." };
  }

  // Billable, un-invoiced, completed entries in the window.
  let entryQuery = supabase
    .from("time_entries")
    .select("id, task_id, duration_seconds, started_at")
    .in("task_id", taskIds)
    .eq("is_billable", true)
    .is("invoice_id", null)
    .not("ended_at", "is", null);
  if (periodStart) entryQuery = entryQuery.gte("started_at", periodStart);
  if (periodEnd) {
    // periodEnd is an inclusive date; include the whole day.
    entryQuery = entryQuery.lte("started_at", `${periodEnd}T23:59:59.999Z`);
  }

  const { data: entries, error: entryErr } = await entryQuery;
  if (entryErr) return { error: entryErr.message };
  if (!entries || entries.length === 0) {
    return { error: "No billable time to invoice for the selected filters." };
  }

  // Aggregate seconds per task; keep the entry ids for stamping on generate.
  const secondsByTask = new Map<string, number>();
  const entryIds: string[] = [];
  let coveredFrom: string | null = null;
  let coveredTo: string | null = null;
  for (const e of entries) {
    entryIds.push(e.id);
    secondsByTask.set(
      e.task_id,
      (secondsByTask.get(e.task_id) ?? 0) + (e.duration_seconds ?? 0),
    );
    if (!coveredFrom || Date.parse(e.started_at) < Date.parse(coveredFrom)) {
      coveredFrom = e.started_at;
    }
    if (!coveredTo || Date.parse(e.started_at) > Date.parse(coveredTo)) {
      coveredTo = e.started_at;
    }
  }

  const lines: InvoiceLineDraft[] = [];
  for (const [taskId, seconds] of secondsByTask) {
    const meta = taskMeta.get(taskId);
    if (!meta) continue;
    const hours = round4(seconds / 3600);
    if (hours <= 0) continue;
    const rate = effectiveRate.get(meta.projectId) ?? 0;
    const label =
      projectIds.length > 1
        ? `${projectName.get(meta.projectId)} — ${meta.name}`
        : meta.name;
    lines.push({
      taskId,
      description: label,
      hours,
      rate,
      amount: round2(hours * rate),
    });
  }

  if (lines.length === 0) {
    return { error: "No billable time to invoice for the selected filters." };
  }

  // Stable order: highest amount first.
  lines.sort((a, b) => b.amount - a.amount);

  const subtotal = round2(lines.reduce((a, l) => a + l.amount, 0));
  const billableHours = round2(lines.reduce((a, l) => a + l.hours, 0));

  // Single tax line snapshot: the client's current tax settings applied to the
  // subtotal. Rate is a percentage; zero-rate / unset ⇒ no tax (amount 0).
  const taxRate = client.tax_rate ?? 0;
  const taxAmount = taxRate > 0 ? round2((subtotal * taxRate) / 100) : 0;
  const tax: InvoiceTax = {
    label: client.tax_label ?? null,
    rate: taxRate,
    amount: taxAmount,
  };

  return {
    draft: {
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        address: client.address,
        currency: client.currency,
      },
      lines,
      subtotal,
      tax,
      total: round2(subtotal + taxAmount),
      currency: client.currency,
      billableHours,
      entryIds,
      periodStart: periodStart ?? null,
      periodEnd: periodEnd ?? null,
      coveredFrom,
      coveredTo,
    },
  };
}

export type UnbilledProjectSummary = { id: string; name: string; amount: number };

export type UnbilledClientSummary = {
  id: string;
  name: string;
  currency: string;
  hours: number;
  amount: number;
  /** Only projects with unbilled billable time, highest amount first. */
  projects: UnbilledProjectSummary[];
};

/**
 * Per-client unbilled summary for the invoice picker. Uses the same entry
 * selection filters and per-task rounding as buildInvoiceDraft, so the amount
 * shown when picking a client equals the previewed subtotal by construction.
 */
export async function listUnbilledClients(
  supabase: Supabase,
): Promise<UnbilledClientSummary[]> {
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, currency, default_rate")
    .eq("is_archived", false);
  if (!clients || clients.length === 0) return [];

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, rate, client_id")
    .in("client_id", clients.map((c) => c.id));
  if (!projects || projects.length === 0) return [];

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, project_id")
    .in("project_id", projects.map((p) => p.id));
  const projectByTask = new Map((tasks ?? []).map((t) => [t.id, t.project_id]));
  if (projectByTask.size === 0) return [];

  const { data: entries } = await supabase
    .from("time_entries")
    .select("task_id, duration_seconds")
    .in("task_id", [...projectByTask.keys()])
    .eq("is_billable", true)
    .is("invoice_id", null)
    .not("ended_at", "is", null);

  const secondsByTask = new Map<string, number>();
  for (const e of entries ?? []) {
    secondsByTask.set(
      e.task_id,
      (secondsByTask.get(e.task_id) ?? 0) + (e.duration_seconds ?? 0),
    );
  }

  type Acc = { hours: number; amount: number; byProject: Map<string, number> };
  const perClient = new Map<string, Acc>();
  for (const [taskId, seconds] of secondsByTask) {
    const projectId = projectByTask.get(taskId);
    const project = projectId ? projectById.get(projectId) : undefined;
    if (!project?.client_id) continue;
    const client = clientById.get(project.client_id);
    if (!client) continue;
    const hours = round4(seconds / 3600);
    if (hours <= 0) continue;
    const rate = project.rate ?? client.default_rate ?? 0;
    const amount = round2(hours * rate);
    const acc =
      perClient.get(client.id) ??
      { hours: 0, amount: 0, byProject: new Map<string, number>() };
    acc.hours += hours;
    acc.amount += amount;
    acc.byProject.set(project.id, (acc.byProject.get(project.id) ?? 0) + amount);
    perClient.set(client.id, acc);
  }

  const result: UnbilledClientSummary[] = [];
  for (const [clientId, acc] of perClient) {
    const client = clientById.get(clientId);
    if (!client) continue;
    result.push({
      id: clientId,
      name: client.name,
      currency: client.currency,
      hours: round2(acc.hours),
      amount: round2(acc.amount),
      projects: [...acc.byProject.entries()]
        .map(([id, amount]) => ({
          id,
          name: projectById.get(id)?.name ?? "",
          amount: round2(amount),
        }))
        .sort((a, b) => b.amount - a.amount),
    });
  }
  result.sort((a, b) => b.amount - a.amount);
  return result;
}
