import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

// Public routes that do not require an authenticated session.
// `/api/paddle` is the server-to-server Paddle webhook — it authenticates via
// its own HMAC signature, so it must bypass the session-redirect guard.
const PUBLIC_PATHS = ["/login", "/auth", "/welcome", "/api/paddle"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token on every request. Do not run
  // logic between createServerClient and getUser or sessions may drop.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    // Guests landing on the site root see the marketing page; deep links to
    // protected routes still go to sign-in.
    url.pathname = path === "/" ? "/welcome" : "/login";
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/welcome")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
