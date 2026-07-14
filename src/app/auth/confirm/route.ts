import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Verifies the token from the activation email that n8n/Gmail delivered.
// Supabase's "Send Email" hook routes the mail through n8n, but the token is
// still a real Supabase token — we redeem it here with verifyOtp().
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
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=activation", origin));
}
