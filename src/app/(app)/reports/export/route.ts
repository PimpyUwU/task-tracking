import { createClient } from "@/lib/supabase/server";
import { assertCanExport } from "@/lib/plan";
import { resolveRange } from "@/lib/reports";
import { formatHours } from "@/lib/time";

// Reads the user session (cookies) and streams a per-user file — never cache it.
export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Unwrap a Supabase embedded to-one relation. */
function one<T>(rel: unknown): T | undefined {
  return (Array.isArray(rel) ? rel[0] : rel) as T | undefined;
}

/** RFC-4180 field escaping. */
function cell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV export of a range's completed entries (Pro — plan.canExport). Uses the
 * SESSION-scoped client so ordinary RLS applies; the admin client is NOT used
 * here. canExport is enforced server-side, so a free user hitting this URL
 * directly gets a 403 rather than a file.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const exportErr = await assertCanExport(supabase);
  if (exportErr) return new Response(exportErr.error, { status: 403 });

  const range = resolveRange(new URL(request.url).searchParams.get("range"));

  const { data: entries, error } = await supabase
    .from("time_entries")
    .select(
      "started_at, ended_at, duration_seconds, is_billable, tasks!inner(name, projects!inner(name, rate, clients(name, default_rate, currency)))",
    )
    .gte("started_at", range.start.toISOString())
    .lt("started_at", range.end.toISOString())
    .not("ended_at", "is", null)
    .order("started_at", { ascending: true });

  if (error) return new Response("Could not build export", { status: 500 });

  const header = [
    "date",
    "start",
    "end",
    "duration_h",
    "task",
    "project",
    "client",
    "billable",
    "rate",
    "amount",
  ];

  const lines = [header.join(",")];
  for (const e of entries ?? []) {
    const task = one<{ name: string; projects: unknown }>(e.tasks);
    const project = one<{ name: string; rate: number | null; clients: unknown }>(task?.projects);
    const client = one<{ name: string; default_rate: number | null; currency: string }>(
      project?.clients,
    );

    const started = new Date(e.started_at);
    const ended = e.ended_at ? new Date(e.ended_at) : null;
    const seconds =
      e.duration_seconds ??
      (ended ? Math.max(0, Math.round((ended.getTime() - started.getTime()) / 1000)) : 0);
    const rate = project?.rate ?? client?.default_rate ?? 0;
    const amount = e.is_billable ? round2((seconds / 3600) * rate) : 0;

    lines.push(
      [
        started.toISOString().slice(0, 10), // date (UTC)
        started.toISOString().slice(11, 16), // start HH:MM (UTC)
        ended ? ended.toISOString().slice(11, 16) : "",
        formatHours(seconds),
        cell(task?.name ?? ""),
        cell(project?.name ?? ""),
        cell(client?.name ?? ""),
        e.is_billable ? "yes" : "no",
        rate.toFixed(2),
        amount.toFixed(2),
      ].join(","),
    );
  }

  const csv = lines.join("\r\n");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fluxwork-report-${range.key}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
