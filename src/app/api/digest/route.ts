import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderDigestEmail, type DigestData } from "@/lib/digestEmail";
import { sendViaResend } from "@/lib/authEmail";

// Service-role reads + node:crypto require the Node.js runtime (not Edge). A
// cron entry point is request-time only — never prerender or cache it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Unwrap a Supabase embedded to-one relation (object, or array under some configs). */
function one<T>(rel: unknown): T | undefined {
  return (Array.isArray(rel) ? rel[0] : rel) as T | undefined;
}

/** Constant-time bearer check against CRON_SECRET. */
function authorized(request: Request, cronSecret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type Window = { start: string; end: string; label: string };

/** The last 7 full UTC days (consistent with metrics.ts's UTC day math). */
function lastSevenDays(now = new Date()): Window {
  const startOfToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const end = new Date(startOfToday); // today 00:00 UTC — exclusive upper bound
  const start = new Date(startOfToday - 7 * 86400000);
  const lastDay = new Date(startOfToday - 86400000);
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `${fmt.format(start)} – ${fmt.format(lastDay)}`,
  };
}

/**
 * Digest-specific aggregation for ONE user.
 *
 * ⚠ RLS BYPASS: the admin/service-role client ignores row-level security, so
 * every query here MUST filter user_id explicitly. Do NOT swap in the
 * RLS-scoped helpers (metrics.ts / unbilled.ts) — with the admin client they
 * would sum across every user's rows. These queries are deliberately local.
 *
 * Returns null when the user tracked nothing in the window (nothing to send).
 */
async function computeForUser(
  admin: Admin,
  userId: string,
  win: Window,
): Promise<DigestData | null> {
  const { data: projects } = await admin
    .from("projects")
    .select("id, name, rate, client_id, clients(default_rate, currency)")
    .eq("user_id", userId);

  const rateByProject = new Map<string, number>();
  const nameByProject = new Map<string, string>();
  let currency = "USD";
  for (const p of projects ?? []) {
    const client = one<{ default_rate: number | null; currency: string }>(p.clients);
    rateByProject.set(p.id, p.rate ?? client?.default_rate ?? 0);
    nameByProject.set(p.id, p.name);
    if (client?.currency) currency = client.currency;
  }

  // Tracked time in the 7-day window (completed entries only).
  const { data: entries } = await admin
    .from("time_entries")
    .select("duration_seconds, is_billable, tasks!inner(project_id)")
    .eq("user_id", userId)
    .gte("started_at", win.start)
    .lt("started_at", win.end)
    .not("ended_at", "is", null);

  let billableSeconds = 0;
  let nonBillableSeconds = 0;
  let earnings = 0;
  const secondsByProject = new Map<string, number>();
  for (const e of entries ?? []) {
    const task = one<{ project_id: string }>(e.tasks);
    const seconds = e.duration_seconds ?? 0;
    if (task) {
      secondsByProject.set(
        task.project_id,
        (secondsByProject.get(task.project_id) ?? 0) + seconds,
      );
    }
    if (e.is_billable) {
      billableSeconds += seconds;
      const rate = task ? (rateByProject.get(task.project_id) ?? 0) : 0;
      earnings += (seconds / 3600) * rate;
    } else {
      nonBillableSeconds += seconds;
    }
  }

  if (billableSeconds + nonBillableSeconds === 0) return null;

  // Top project by tracked time in the window.
  let topProject: DigestData["topProject"] = null;
  for (const [projectId, seconds] of secondsByProject) {
    if (!topProject || seconds > topProject.seconds) {
      topProject = { name: nameByProject.get(projectId) ?? "Untitled project", seconds };
    }
  }

  // Current unbilled billable time (all-time, not yet on an invoice).
  const { data: unbilled } = await admin
    .from("time_entries")
    .select("duration_seconds, tasks!inner(project_id)")
    .eq("user_id", userId)
    .eq("is_billable", true)
    .is("invoice_id", null)
    .not("ended_at", "is", null);

  let unbilledTotal = 0;
  for (const e of unbilled ?? []) {
    const task = one<{ project_id: string }>(e.tasks);
    const rate = task ? (rateByProject.get(task.project_id) ?? 0) : 0;
    unbilledTotal += ((e.duration_seconds ?? 0) / 3600) * rate;
  }

  return {
    periodLabel: win.label,
    currency,
    earnings: round2(earnings),
    trackedSeconds: billableSeconds + nonBillableSeconds,
    billableSeconds,
    nonBillableSeconds,
    unbilledTotal: round2(unbilledTotal),
    unbilledCurrency: currency,
    topProject,
    appUrl: (process.env.AUTH_EMAIL_SITE_URL || "https://fluxwork-gamma.vercel.app").replace(/\/$/, ""),
  };
}

/**
 * Weekly digest cron entry point (Vercel Cron → GET, Mondays 07:00 UTC; see
 * vercel.json). Authenticates with a shared secret, enumerates users with the
 * admin client, and mails each active user their weekly review.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const admin = createAdminClient();

  // Env-gated graceful degradation: without the cron secret or the service-role
  // key we can neither authenticate nor read — no-op cleanly (503), same posture
  // as the Paddle webhook before its keys are provisioned.
  if (!cronSecret || !admin) {
    return new Response("digest not configured", { status: 503 });
  }

  if (!authorized(request, cronSecret)) {
    return new Response("unauthorized", { status: 401 });
  }

  const win = lastSevenDays();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  // Enumerate users defensively: page until a short page comes back.
  const perPage = 200;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      failed += 1;
      break;
    }
    const users = data?.users ?? [];
    if (users.length === 0) break;

    for (const user of users) {
      // Respect the opt-out flag (More → Weekly digest). Default is on.
      if (user.user_metadata?.digest_opt_out === true) {
        skipped += 1;
        continue;
      }
      if (!user.email) {
        skipped += 1;
        continue;
      }

      try {
        const digest = await computeForUser(admin, user.id, win);
        if (!digest) {
          skipped += 1; // nothing tracked this week
          continue;
        }
        const { subject, html } = renderDigestEmail(digest);
        const result = await sendViaResend(user.email, subject, html);
        if (result.ok) {
          sent += 1;
        } else {
          // Per-user fail-soft: log and carry on. Resend's sandbox domain only
          // delivers to the account owner until a custom domain is verified —
          // that's expected, not a bug to work around.
          console.error(`[digest] send failed for ${user.id}: ${result.error}`);
          failed += 1;
        }
      } catch (e) {
        console.error(`[digest] error for ${user.id}:`, e);
        failed += 1;
      }
    }

    if (users.length < perPage) break;
  }

  return Response.json({ sent, skipped, failed });
}
