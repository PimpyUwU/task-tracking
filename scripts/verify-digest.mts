// Local verification for the weekly digest work. No network, no emails.
//
//   npx tsx scripts/verify-digest.mts
//
// 1. Guards the authEmail refactor: the NEW renderAuthEmail (now built on the
//    shared emailShell) must produce BYTE-IDENTICAL output to the pre-refactor
//    template, across every action type and with/without a one-time code.
// 2. Exercises the /api/digest handler's env-gating: missing config → 503,
//    configured-but-wrong-bearer → 401. Neither path touches Supabase or Resend.

import { renderAuthEmail } from "../src/lib/authEmail.ts";
import { GET as digestGET } from "../src/app/api/digest/route.ts";

let failures = 0;
const assert = (cond: unknown, msg: string) => {
  if (cond) {
    console.log("  ✓", msg);
  } else {
    console.error("  ✗ FAIL:", msg);
    failures += 1;
  }
};

// ── Reference: the pre-refactor auth template, copied verbatim ───────────────
function escapeHtmlOld(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
type Copy = { subject: string; kicker: string; heading: string; intro: string; cta: string };
const COPY: Record<string, Copy> = {
  signup: { subject: "Confirm your FluxWork account", kicker: "Account", heading: "Confirm your account", intro: "Welcome to FluxWork. Confirm your email to start tracking billable time and turning it into invoices.", cta: "Confirm account" },
  magiclink: { subject: "Your FluxWork sign-in link", kicker: "Sign in", heading: "Your sign-in link", intro: "Use the button below to sign in to FluxWork. For your security, this link expires shortly.", cta: "Sign in" },
  recovery: { subject: "Reset your FluxWork password", kicker: "Password reset", heading: "Reset your password", intro: "We received a request to reset your FluxWork password. Choose a new one with the button below. If this wasn't you, you can safely ignore this email.", cta: "Reset password" },
  invite: { subject: "You've been invited to FluxWork", kicker: "Invitation", heading: "Accept your invitation", intro: "You've been invited to FluxWork. Confirm your email to set up your account and get started.", cta: "Accept invite" },
  email_change: { subject: "Confirm your new FluxWork email", kicker: "Email change", heading: "Confirm your new email", intro: "Confirm this address to finish updating the email on your FluxWork account.", cta: "Confirm email" },
};
function renderAuthEmailOld(actionType: string, confirmUrl: string, token: string): { subject: string; html: string } {
  const c = COPY[actionType] ?? COPY.signup;
  const url = escapeHtmlOld(confirmUrl);
  const logo = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="width:40px;height:40px;background:#0e5c63;border-radius:11px;text-align:center;vertical-align:middle;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:26px;color:#eef1f1;">F</div>
        <div style="height:2px;margin:-3px 9px 0;background:#e0b36a;border-radius:2px;line-height:2px;font-size:0;">&nbsp;</div>
      </td>
      <td style="padding-left:11px;font-family:Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.01em;color:#0f1a1c;">FluxWork</td>
    </tr></table>`;
  const codeBlock = token
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;"><tr>
        <td style="background:#eef1f1;border-radius:11px;padding:14px 16px;">
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#7e8a8d;margin:0 0 4px;">One-time code</div>
          <div style="font-family:'Courier New',monospace;font-size:20px;letter-spacing:3px;font-weight:700;color:#0f1a1c;">${escapeHtmlOld(token)}</div>
        </td></tr></table>`
    : "";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#eef1f1;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtmlOld(c.intro)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1f1;">
    <tr><td align="center" style="padding:36px 16px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:100%;">
        <tr><td style="padding:0 4px 22px;">${logo}</td></tr>
        <tr><td style="background:#ffffff;border:1px solid #dce2e1;border-top:3px solid #b9791f;border-radius:16px;padding:36px 34px;">
          <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#0e5c63;font-weight:700;">${escapeHtmlOld(c.kicker)}</div>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.15;margin:12px 0 10px;color:#0f1a1c;">${escapeHtmlOld(c.heading)}</h1>
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#566468;margin:0 0 26px;">${escapeHtmlOld(c.intro)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="border-radius:11px;background:#0e5c63;">
              <a href="${url}" style="display:inline-block;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:11px;">${escapeHtmlOld(c.cta)} &rarr;</a>
            </td>
          </tr></table>
          <div style="height:1px;background:#dce2e1;margin:28px 0 0;line-height:1px;font-size:0;">&nbsp;</div>
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#7e8a8d;margin:20px 0 4px;">Or paste this link into your browser:</p>
          <p style="font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#0e5c63;word-break:break-all;margin:0;">${url}</p>
          ${codeBlock}
        </td></tr>
        <tr><td style="padding:22px 6px 0;">
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#7e8a8d;margin:0;">FluxWork &middot; time tracking &amp; invoicing for freelancers</p>
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9aa4a6;margin:6px 0 0;">If you didn't request this email, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject: c.subject, html };
}

console.log("\n[1] authEmail refactor is output-preserving (byte-identical)");
const url = "https://fluxwork-gamma.vercel.app/auth/confirm?token_hash=abc<>&type=signup&next=/";
for (const type of ["signup", "magiclink", "recovery", "invite", "email_change", "unknown"]) {
  for (const token of ["", "123456"]) {
    const a = renderAuthEmail(type, url, token);
    const b = renderAuthEmailOld(type, url, token);
    assert(a.subject === b.subject && a.html === b.html, `${type} / token="${token}" identical`);
  }
}

console.log("\n[2] /api/digest env-gating");
const req = (auth?: string) =>
  new Request("http://localhost/api/digest", auth ? { headers: { authorization: auth } } : undefined);

// 503 — no CRON_SECRET / service-role key configured.
delete process.env.CRON_SECRET;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const r503 = await digestGET(req("Bearer whatever"));
assert(r503.status === 503, "missing config → 503");

// 401 — configured, but the bearer token is wrong (auth fails before any read).
process.env.CRON_SECRET = "test-secret";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-role-key";
const r401missing = await digestGET(req());
assert(r401missing.status === 401, "no bearer → 401");
const r401wrong = await digestGET(req("Bearer nope"));
assert(r401wrong.status === 401, "wrong bearer → 401");

if (failures > 0) {
  console.error(`\n✗ ${failures} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ ALL DIGEST CHECKS PASSED");
process.exit(0);
