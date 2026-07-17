import crypto from "node:crypto";

/**
 * Auth transactional email — the Next.js backend replacement for the former
 * n8n "Supabase Auth Emails → Gmail" workflow. Supabase's "Send Email" auth hook
 * POSTs here (see src/app/api/auth/send-email/route.ts); we verify the Standard
 * Webhooks signature, render a branded email, and deliver it via Resend's HTTP
 * API. No external automation service is involved.
 */

// ── Payload shape (Supabase Send Email hook) ────────────────────────────────
export type SendEmailHookPayload = {
  user: { id: string; email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string; // signup | magiclink | recovery | invite | email_change
    site_url: string;
  };
};

// ── Standard Webhooks signature verification ────────────────────────────────
// Supabase signs hook deliveries per the Standard Webhooks spec: headers
// `webhook-id`, `webhook-timestamp`, `webhook-signature`; the secret is base64
// after a `v1,whsec_` prefix (Supabase's dashboard form); signature =
// base64(HMAC-SHA256(`${id}.${ts}.${body}`)).
const TOLERANCE_SECONDS = 5 * 60;

export function verifyHookSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !sigHeader) return false;

  // Reject stale deliveries to blunt replay.
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) return false;
  if (Math.abs(Date.now() / 1000 - tsNum) > TOLERANCE_SECONDS) return false;

  // Strip the `v1,` version tag and `whsec_` prefix Supabase prepends, leaving
  // the raw base64 signing key.
  const secretBytes = Buffer.from(
    secret.replace(/^v1,/, "").replace(/^whsec_/, ""),
    "base64",
  );
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  // Header is a space-delimited list of `v1,<base64sig>` versions.
  return sigHeader.split(" ").some((part) => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    const given = Buffer.from(sig);
    return (
      given.length === expectedBuf.length &&
      crypto.timingSafeEqual(given, expectedBuf)
    );
  });
}

// ── Confirm link ────────────────────────────────────────────────────────────
/**
 * Build the activation link that redeems the token at our own /auth/confirm
 * route (which calls verifyOtp). Mirrors the query params that route reads.
 *
 * The base is our own app origin (`AUTH_EMAIL_SITE_URL`), NOT the hook's
 * `site_url`: the latter reflects Supabase's "Site URL" setting, which if left
 * as the project URL yields a link that hits the Supabase gateway ("No API key
 * found") instead of this app's /auth/confirm route.
 */
export function buildConfirmUrl(data: SendEmailHookPayload["email_data"]): string {
  const base = (process.env.AUTH_EMAIL_SITE_URL || data.site_url).replace(/\/$/, "");
  const params = new URLSearchParams({
    token_hash: data.token_hash,
    type: data.email_action_type,
  });
  if (data.redirect_to) params.set("next", data.redirect_to);
  return `${base}/auth/confirm?${params.toString()}`;
}

// ── Branded template ────────────────────────────────────────────────────────
const COPY: Record<string, { subject: string; heading: string; intro: string; cta: string }> = {
  signup: {
    subject: "Confirm your FluxWork account",
    heading: "Confirm your account",
    intro: "Welcome to FluxWork. Confirm your email to start tracking billable time.",
    cta: "Confirm account",
  },
  magiclink: {
    subject: "Your FluxWork sign-in link",
    heading: "Sign in to FluxWork",
    intro: "Use the button below to sign in. This link expires shortly.",
    cta: "Sign in",
  },
  recovery: {
    subject: "Reset your FluxWork password",
    heading: "Reset your password",
    intro: "We received a request to reset your password. If this wasn't you, ignore this email.",
    cta: "Reset password",
  },
  invite: {
    subject: "You've been invited to FluxWork",
    heading: "Accept your invitation",
    intro: "You've been invited to FluxWork. Confirm your email to get started.",
    cta: "Accept invite",
  },
  email_change: {
    subject: "Confirm your new FluxWork email",
    heading: "Confirm your new email",
    intro: "Confirm this address to finish updating your FluxWork email.",
    cta: "Confirm email",
  },
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function renderAuthEmail(
  actionType: string,
  confirmUrl: string,
  token: string,
): { subject: string; html: string } {
  const c = COPY[actionType] ?? COPY.signup;
  const url = escapeHtml(confirmUrl);
  const html = `<!doctype html>
<html>
<body style="margin:0;background:#eef1f1;padding:32px 0;font-family:Helvetica,Arial,sans-serif;color:#0f1a1c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #dce2e1;border-radius:16px;padding:32px;">
        <tr><td>
          <div style="font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#0e5c63;font-weight:600;">FluxWork</div>
          <h1 style="font-size:22px;margin:16px 0 8px;color:#0f1a1c;">${escapeHtml(c.heading)}</h1>
          <p style="font-size:15px;line-height:1.5;color:#566468;margin:0 0 24px;">${escapeHtml(c.intro)}</p>
          <a href="${url}" style="display:inline-block;background:#0e5c63;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:11px;">${escapeHtml(c.cta)}</a>
          <p style="font-size:13px;line-height:1.5;color:#7e8a8d;margin:24px 0 0;">Or paste this link into your browser:<br><span style="color:#0e5c63;word-break:break-all;">${url}</span></p>
          ${token ? `<p style="font-size:13px;color:#7e8a8d;margin:16px 0 0;">One-time code: <strong style="font-family:monospace;color:#0f1a1c;">${escapeHtml(token)}</strong></p>` : ""}
        </td></tr>
      </table>
      <p style="font-size:12px;color:#7e8a8d;margin:20px 0 0;">FluxWork · time tracking &amp; invoicing for freelancers</p>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject: c.subject, html };
}

// ── Delivery (Resend HTTP API, no SDK dependency) ───────────────────────────
export async function sendViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, error: "email not configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `resend ${res.status}: ${detail.slice(0, 200)}` };
  }
  return { ok: true };
}
