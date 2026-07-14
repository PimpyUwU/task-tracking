import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "@/components/ProjectForm";
import { Sparkline } from "@/components/Sparkline";
import { formatHours } from "@/lib/time";
import { formatMoney } from "@/lib/invoice";
import { getOverviewMetrics } from "@/lib/metrics";
import type { Project, ProjectRollup } from "@/lib/database.types";

export default async function OverviewPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: rollups }, { data: clients }, metrics] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .order("is_archived", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("project_rollups").select("*"),
      supabase
        .from("clients")
        .select("id, name, default_rate")
        .eq("is_archived", false)
        .order("name", { ascending: true }),
      getOverviewMetrics(supabase),
    ]);

  const clientOptions = (clients ?? []).map((c) => ({ id: c.id, name: c.name }));
  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const rollupByProject = new Map<string, ProjectRollup>();
  for (const r of rollups ?? []) if (r.project_id) rollupByProject.set(r.project_id, r);

  const list = (projects ?? []) as Project[];
  const active = list.filter((p) => !p.is_archived);
  const needsClient = active.filter((p) => p.is_billable && !p.client_id).length;

  const cur = metrics.currency;
  const billHours = metrics.thisWeek.billableSeconds / 3600;
  const nonHours = metrics.thisWeek.nonBillableSeconds / 3600;
  const totalWeek = billHours + nonHours;
  const billPct = totalWeek > 0 ? (billHours / totalWeek) * 100 : 100;

  const sinceMon = (new Date().getUTCDay() + 6) % 7;
  const todayEarnings = metrics.daily[Math.min(6, sinceMon)] ?? 0;

  const up = metrics.deltaPct != null && metrics.deltaPct >= 0;

  return (
    <div className="max-w-5xl px-5 md:px-8 py-7 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-ink-2 mt-1">
            Here’s what you’ve earned this week.
          </p>
        </div>
        <ProjectForm clients={clientOptions} />
      </div>

      {/* Hero — billable earnings */}
      <div className="rounded-[var(--radius-card)] overflow-hidden border grid md:grid-cols-[1.15fr_1fr]"
        style={{
          borderColor: "var(--line)",
          background:
            "radial-gradient(560px 260px at 18% 130%, var(--gold-dim), transparent 62%), var(--paper-2)",
          boxShadow: "0 1px 2px rgba(15,26,28,0.04)",
        }}
      >
        <div className="p-6 md:border-r border-b md:border-b-0 border-line">
          <div className="label text-gold flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold inline-block" />
            Projected earnings · this week
          </div>
          <div className="serif text-ink leading-none mt-3 inline-block"
            style={{ fontSize: "clamp(2.6rem, 6vw, 3.75rem)" }}
          >
            {formatMoney(metrics.thisWeek.earnings, cur)}
            <span className="block mt-2 h-0.5 w-14 rounded-full" style={{ background: "var(--brass)" }} />
          </div>
          <div className="num text-sm text-ink-2 mt-3">
            <b className="text-ink font-semibold">{billHours.toFixed(1)} h</b>{" "}
            billable · avg{" "}
            {formatMoney(billHours > 0 ? metrics.thisWeek.earnings / billHours : 0, cur)}/hr
          </div>
          <div className="mt-5">
            <div className="split">
              <i className="bill" style={{ width: `${billPct}%` }} />
              <i className="non" style={{ width: `${100 - billPct}%` }} />
            </div>
            <div className="flex gap-5 mt-2 text-[0.7rem] text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-[2px] bg-gold inline-block" />
                Billable {billHours.toFixed(1)} h
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-[2px] bg-steel inline-block" />
                Non-billable {nonHours.toFixed(1)} h
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col justify-center gap-4">
          <div className="flex items-baseline gap-2.5">
            {metrics.deltaPct != null ? (
              <>
                <span
                  className="num text-lg font-semibold"
                  style={{ color: up ? "var(--gold)" : "var(--steel)" }}
                >
                  {up ? "▲" : "▼"} {Math.abs(metrics.deltaPct).toFixed(0)}%
                </span>
                <span className="text-xs text-ink-2">
                  vs last week · {formatMoney(metrics.lastWeek.earnings, cur)}
                </span>
              </>
            ) : (
              <span className="text-xs text-ink-3">
                No earnings last week to compare
              </span>
            )}
          </div>
          <div className="flex items-end gap-3">
            <Sparkline values={metrics.daily} />
            <div className="text-[0.7rem] text-ink-3">
              Today
              <b className="num block text-[0.95rem] text-ink font-semibold">
                {formatMoney(todayEarnings, cur)}
              </b>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="panel p-4">
          <div className="label flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-[2px] bg-gold inline-block" />
            Unbilled · ready to invoice
          </div>
          <div className="num text-2xl text-gold mt-2">
            {formatMoney(metrics.unbilled.total, cur)}
          </div>
          <div className="text-[0.7rem] text-ink-2 mt-1">
            {metrics.unbilled.clients > 0
              ? `across ${metrics.unbilled.clients} client${metrics.unbilled.clients === 1 ? "" : "s"}`
              : "nothing outstanding"}
          </div>
        </div>
        <div className="panel p-4">
          <div className="label flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-[2px] border border-steel inline-block" />
            Non-billable this week
          </div>
          <div className="num text-2xl text-steel mt-2">{nonHours.toFixed(1)} h</div>
          <div className="text-[0.7rem] text-ink-2 mt-1">admin, learning, internal</div>
        </div>
        <div className="panel p-4">
          <div className="label">Active projects</div>
          <div className="num text-2xl mt-2">{active.length}</div>
          <div className="text-[0.7rem] mt-1"
            style={{ color: needsClient > 0 ? "var(--danger)" : "var(--ink-2)" }}
          >
            {needsClient > 0 ? `${needsClient} needs a client` : "all set to bill"}
          </div>
        </div>
      </div>

      {/* Projects */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="panel-title">Projects</h2>
          <span className="num text-xs text-ink-3">{list.length}</span>
        </div>

        {list.length === 0 ? (
          <div className="panel py-16 px-6 text-center">
            <p className="font-medium mb-1">No projects yet</p>
            <p className="text-sm text-ink-2 mb-5">
              Create a project, add tasks, and start the timer to track time.
            </p>
            <div className="inline-flex">
              <ProjectForm clients={clientOptions} />
            </div>
          </div>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full border-collapse min-w-[620px]">
              <thead>
                <tr className="bg-surface-2">
                  <th className="text-left label font-semibold px-4 py-3 rule-b">Project</th>
                  <th className="text-left label font-semibold px-4 py-3 rule-b">Client</th>
                  <th className="text-left label font-semibold px-4 py-3 rule-b">Billable split</th>
                  <th className="text-right label font-semibold px-4 py-3 rule-b">Tracked</th>
                  <th className="text-right label font-semibold px-4 py-3 rule-b">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const r = rollupByProject.get(p.id);
                  const total = r?.total_seconds ?? 0;
                  const bill = r?.billable_seconds ?? 0;
                  const client = p.client_id ? clientById.get(p.client_id) : null;
                  const rate = p.rate ?? client?.default_rate ?? 0;
                  const earnings = (bill / 3600) * rate;
                  const pct = total > 0 ? (bill / total) * 100 : p.is_billable ? 100 : 0;
                  const noClient = p.is_billable && !p.client_id;
                  return (
                    <tr key={p.id} className="rule-b last:border-b-0 hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${p.id}`} className="flex items-center gap-3 min-w-0 hover:text-gold transition-colors">
                          <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] shrink-0" style={{ background: p.color }} />
                          <span className="font-semibold text-sm truncate">{p.name}</span>
                          {p.code && <span className="num text-[0.7rem] text-ink-3 shrink-0">{p.code}</span>}
                          {p.is_archived && <span className="text-[0.7rem] text-ink-3 shrink-0">· archived</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {noClient ? (
                          <Link href={`/projects/${p.id}`} className="badge badge-warn">⚠ No client</Link>
                        ) : (
                          <span className="text-sm text-ink-2 truncate">
                            {client?.name ?? p.client ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[118px]">
                        <div className="split">
                          {pct > 0 && <i className="bill" style={{ width: `${pct}%` }} />}
                          {pct < 100 && <i className="non" style={{ width: `${100 - pct}%` }} />}
                        </div>
                        <div className="num text-[0.65rem] text-ink-3 mt-1.5">
                          {p.is_billable ? `${Math.round(pct)}% billable` : "non-billable"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right num text-sm">{formatHours(total)} h</td>
                      <td className="px-4 py-3 text-right">
                        {!p.is_billable ? (
                          <span className="badge badge-non"><span className="dot" />Non-billable</span>
                        ) : noClient ? (
                          <span className="text-[0.7rem] text-ink-3">Set client to bill</span>
                        ) : (
                          <span className="num text-sm text-gold font-semibold">
                            {formatMoney(earnings, cur)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
