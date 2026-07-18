import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Verifies the token from the activation email delivered by our own Next.js
// backend (Supabase "Send Email" hook → /api/auth/send-email → Resend). The
// token is a real Supabase token — we redeem it here with verifyOtp().
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Only honor same-origin redirect targets to avoid open redirects.
  const safeNext = (() => {
    try {
      const url = new URL(next, origin);
      return url.origin === origin ? url.pathname + url.search : "/";
    } catch {
      return "/";
    }
  })();

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      // A password-recovery token must always land on the set-new-password
      // screen — never deep-link into the app, or it behaves like a magic
      // sign-in and the user never actually resets their password.
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/reset-password", origin));
      }
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=activation", origin));
}
