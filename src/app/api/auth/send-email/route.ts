import { type NextRequest } from "next/server";
import {
  verifyHookSignature,
  buildConfirmUrl,
  renderAuthEmail,
  sendViaResend,
  type SendEmailHookPayload,
} from "@/lib/authEmail";

// node:crypto (signature verification) requires the Node.js runtime, not Edge.
export const runtime = "nodejs";

/**
 * Supabase "Send Email" auth hook → Next.js backend. Replaces the former n8n
 * workflow. Verifies the Standard Webhooks signature, renders a branded email,
 * and delivers it via Resend. Returning non-200 makes Supabase abort the auth
 * action, so misconfiguration fails loudly rather than silently dropping mail.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.AUTH_EMAIL_HOOK_SECRET;
  if (!secret) {
    return new Response("Auth email hook not configured", { status: 500 });
  }

  const rawBody = await request.text();
  if (!verifyHookSignature(rawBody, request.headers, secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: SendEmailHookPayload;
  try {
    payload = JSON.parse(rawBody) as SendEmailHookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { user, email_data } = payload;
  if (!user?.email || !email_data?.token_hash) {
    return new Response("Malformed payload", { status: 400 });
  }

  const confirmUrl = buildConfirmUrl(email_data);
  const { subject, html } = renderAuthEmail(
    email_data.email_action_type,
    confirmUrl,
    email_data.token,
  );

  const result = await sendViaResend(user.email, subject, html);
  if (!result.ok) {
    // Surface to Supabase so it retries / the user sees the auth action failed.
    return new Response(`Email delivery failed: ${result.error}`, { status: 502 });
  }

  return Response.json({ ok: true });
}
