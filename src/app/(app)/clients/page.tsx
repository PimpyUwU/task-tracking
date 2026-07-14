import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "@/components/ClientForm";
import { formatMoney } from "@/lib/invoice";
import type { Client } from "@/lib/database.types";

function relativeDate(iso: string | null): string {
  if (!iso) return "No activity";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

export default async function ClientsPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: projects }, { data: unbilled }, { data: rollups }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .order("is_archived", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("projects").select("id, client_id, rate, is_archived"),
      supabase
        .from("time_entries")
        .select("duration_seconds, tasks!inner(project_id)")
        .eq("is_billable", true)
        .is("invoice_id", null)
        .not("ended_at", "is", null),
      supabase.from("task_rollups").select("project_id, last_tracked_at"),
    ]);

  const list = (clients ?? []) as Client[];
  const clientById = new Map(list.map((c) => [c.id, c]));

  // project → client + effective rate
  const projClient = new Map<string, string | null>();
  const projRate = new Map<string, number>();
  const activeByClient = new Map<string, number>();
  for (const p of projects ?? []) {
    projClient.set(p.id, p.client_id);
    const c = p.client_id ? clientById.get(p.client_id) : null;
    projRate.set(p.id, p.rate ?? c?.default_rate ?? 0);
    if (p.client_id && !p.is_archived) {
      activeByClient.set(p.client_id, (activeByClient.get(p.client_id) ?? 0) + 1);
    }
  }

  // unbilled billable amount per client
  const unbilledByClient = new Map<string, number>();
  for (const e of unbilled ?? []) {
    const task = (Array.isArray(e.tasks) ? e.tasks[0] : e.tasks) as
      | { project_id: string }
      | undefined;
    if (!task) continue;
    const clientId = projClient.get(task.project_id);
    if (!clientId) continue;
    const amount = ((e.duration_seconds ?? 0) / 3600) * (projRate.get(task.project_id) ?? 0);
    unbilledByClient.set(clientId, (unbilledByClient.get(clientId) ?? 0) + amount);
  }

  // last activity per client (max across its projects)
  const lastByClient = new Map<string, string>();
  for (const r of rollups ?? []) {
    if (!r.project_id || !r.last_tracked_at) continue;
    const clientId = projClient.get(r.project_id);
    if (!clientId) continue;
    const prev = lastByClient.get(clientId);
    if (!prev || r.last_tracked_at > prev) lastByClient.set(clientId, r.last_tracked_at);
  }

  const totalUnbilled = [...unbilledByClient.values()].reduce((a, b) => a + b, 0);
  const cur = list.find((c) => c.currency)?.currency ?? "USD";

  return (
    <div className="max-w-5xl px-5 md:px-8 py-7 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-ink-2 mt-1">
            Who you bill — and what’s waiting to be invoiced.
          </p>
        </div>
        <ClientForm mode="create" />
      </div>

      {list.length > 0 && (
        <div className="panel p-4 flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-[2px] bg-gold inline-block" />
          <span className="label">Total unbilled</span>
          <span className="num text-xl text-gold ml-auto">
            {formatMoney(totalUnbilled, cur)}
          </span>
        </div>
      )}

      {list.length === 0 ? (
        <div className="panel py-16 px-6 text-center">
          <p className="font-medium mb-1">No clients yet</p>
          <p className="text-sm text-ink-2 mb-5">
            Add a client with a default hourly rate, then link projects to it.
          </p>
          <div className="inline-flex"><ClientForm mode="create" /></div>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-2">
                <th className="text-left label font-semibold px-4 py-3 rule-b">Client</th>
                <th className="text-right label font-semibold px-4 py-3 rule-b">Unbilled</th>
                <th className="text-right label font-semibold px-4 py-3 rule-b">Rate</th>
                <th className="text-center label font-semibold px-4 py-3 rule-b">Projects</th>
                <th className="text-right label font-semibold px-4 py-3 rule-b">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const unbilledAmt = unbilledByClient.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="rule-b last:border-b-0 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3.5">
                      <Link href={`/clients/${c.id}`} className="min-w-0 block hover:text-gold transition-colors">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          {c.name}
                          {c.is_archived && <span className="text-[0.7rem] text-ink-3">· archived</span>}
                        </span>
                        {c.email && <span className="text-xs text-ink-3 truncate block">{c.email}</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {unbilledAmt > 0 ? (
                        <span className="num text-sm text-gold font-semibold">{formatMoney(unbilledAmt, c.currency)}</span>
                      ) : (
                        <span className="num text-sm text-ink-3">{formatMoney(0, c.currency)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right num text-sm text-ink-2">
                      {c.default_rate != null ? `${formatMoney(c.default_rate, c.currency)}/h` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center num text-sm text-ink-2">
                      {activeByClient.get(c.id) ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm text-ink-2">
                      {relativeDate(lastByClient.get(c.id) ?? null)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
