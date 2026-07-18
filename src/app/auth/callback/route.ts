import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackOnce } from "@/lib/analytics";

/**
 * OAuth (PKCE) return leg. The provider redirects here with a `code`; we
 * exchange it — reading the verifier cookie set by signInWithProvider — for a
 * session, then land the user at `next`. The signup funnel event is recorded
 * once per user so a first OAuth sign-in counts like a password signup.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
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

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) await trackOnce(supabase, data.user.id, "signup");

      // Behind a proxy (Vercel), the load balancer's forwarded host is the
      // real public origin; the request origin is the internal one.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const base =
        process.env.NODE_ENV === "development" || !forwardedHost
          ? origin
          : `https://${forwardedHost}`;
      return NextResponse.redirect(`${base}${safeNext}`);
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
