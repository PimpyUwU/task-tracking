import { type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackOnce } from "@/lib/analytics";
import type { Database } from "@/lib/database.types";

// Service-role writes + node:crypto require the Node.js runtime (not Edge).
export const runtime = "nodejs";

/**
 * Verify Paddle's `Paddle-Signature` header. Format: `ts=<unix>;h1=<hex>`, where
 * h1 = HMAC-SHA256(`${ts}:${rawBody}`) keyed by the webhook secret. Compared in
 * constant time. See Paddle Billing "Verify webhook signatures".
 */
function verifySignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string,
): boolean {
  if (!sigHeader) return false;
  const parts: Record<string, string> = {};
  for (const seg of sigHeader.split(";")) {
    const idx = seg.indexOf("=");
    if (idx === -1) continue;
    parts[seg.slice(0, idx).trim()] = seg.slice(idx + 1).trim();
  }
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(h1, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Minimal shapes we read off Paddle Billing event payloads. */
type PaddleEntity = {
  id?: string;
  status?: string;
  customer_id?: string;
  subscription_id?: string;
  custom_data?: { user_id?: string } | null;
  current_billing_period?: { ends_at?: string | null } | null;
  items?: Array<{ price?: { id?: string } | null }> | null;
};
type PaddleEvent = {
  event_id?: string;
  event_type?: string;
  data?: PaddleEntity;
};

type SubUpdate = Database["public"]["Tables"]["subscriptions"]["Update"] & {
  user_id: string;
};

export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  const admin = createAdminClient();

  // Env-gated: with no secret or service-role key we can't verify or persist.
  // Ack cleanly so an unconfigured deployment still runs (sandbox keys pending).
  if (!secret || !admin) {
    return Response.json({ ok: true, skipped: "billing not configured" });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");
  if (!verifySignature(rawBody, signature, secret)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventId = event.event_id;
  const eventType = event.event_type;
  const entity = event.data;
  if (!eventId || !eventType || !entity) {
    return new Response("Malformed event", { status: 400 });
  }

  // Idempotency: claim the event id first. A duplicate delivery hits the PK and
  // is acked without reprocessing.
  const { error: claimErr } = await admin
    .from("paddle_events")
    .insert({ event_id: eventId, event_type: eventType });
  if (claimErr) {
    if (claimErr.code === "23505") {
      return Response.json({ ok: true, deduped: true });
    }
    return new Response("Storage error", { status: 500 });
  }

  try {
    await applyEvent(admin, eventType, entity);
  } catch (e) {
    // Release the claim so Paddle's retry can reprocess.
    await admin.from("paddle_events").delete().eq("event_id", eventId);
    const msg = e instanceof Error ? e.message : "unknown error";
    return new Response(`Webhook processing error: ${msg}`, { status: 500 });
  }

  return Response.json({ ok: true });
}

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/**
 * Resolve the FluxWork user for an event: prefer the `custom_data.user_id` we
 * stamp at checkout, else fall back to matching an existing subscriptions row by
 * Paddle customer or subscription id. Returns null if the event can't be
 * attributed (then we simply ack and move on).
 */
async function resolveUserId(
  admin: Admin,
  entity: PaddleEntity,
): Promise<string | null> {
  const fromCustom = entity.custom_data?.user_id;
  if (fromCustom) return fromCustom;

  const customerId = entity.customer_id ?? null;
  const subId = entity.id ?? entity.subscription_id ?? null;

  if (customerId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("paddle_customer_id", customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }
  if (subId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("paddle_subscription_id", subId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }
  return null;
}

async function applyEvent(
  admin: Admin,
  eventType: string,
  entity: PaddleEntity,
): Promise<void> {
  const userId = await resolveUserId(admin, entity);
  if (!userId) return; // unattributable — nothing to write

  const periodEnd = entity.current_billing_period?.ends_at ?? undefined;
  const priceId = entity.items?.[0]?.price?.id ?? undefined;

  const patch: SubUpdate = { user_id: userId };

  switch (eventType) {
    case "subscription.created":
    case "subscription.activated":
    case "subscription.updated": {
      // Honour Paddle's own status so a scheduled cancel (still active until the
      // period ends) or a dunning state is reflected accurately.
      const paddleStatus = entity.status;
      patch.status =
        paddleStatus === "past_due"
          ? "past_due"
          : paddleStatus === "canceled"
            ? "canceled"
            : "active";
      if (entity.id) patch.paddle_subscription_id = entity.id;
      if (entity.customer_id) patch.paddle_customer_id = entity.customer_id;
      if (priceId) patch.plan = priceId;
      if (periodEnd) patch.current_period_end = periodEnd;
      break;
    }
    case "subscription.canceled": {
      // Fired when the subscription actually ends — revoke now.
      patch.status = "canceled";
      if (periodEnd) patch.current_period_end = periodEnd;
      break;
    }
    case "subscription.past_due":
    case "transaction.payment_failed": {
      patch.status = "past_due";
      break;
    }
    default:
      return; // event we don't act on
  }

  const { error } = await admin
    .from("subscriptions")
    .upsert(patch, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  // Funnel: upgrade — recorded once per user, on their first activation.
  if (patch.status === "active") {
    await trackOnce(admin, userId, "upgrade", { plan: patch.plan ?? null });
  }
}
