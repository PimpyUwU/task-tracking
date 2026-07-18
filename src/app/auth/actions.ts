"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/analytics";

export type AuthState = { error?: string; message?: string };

// OAuth providers wired up in the Supabase dashboard. A "use server" file may
// only export async functions, so this stays module-local (only used below).
const OAUTH_PROVIDERS = ["google", "apple", "github"] as const;
type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email || password.length < 6) {
    return { error: "Enter an email and a password of at least 6 characters." };
  }

  if (password !== confirm) {
    return { error: "The passwords don't match." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };

  // When email confirmation is enabled, no session is returned yet.
  if (!data.session) {
    return { message: "Account created. Check your email to confirm, then sign in." };
  }

  // Funnel: signup (only recordable once a session exists so RLS insert passes).
  await track(supabase, "signup");

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Start an OAuth sign-in. Supabase (PKCE) hands back a provider URL and stores
 * the code verifier in a cookie via our server client; we redirect the browser
 * to the provider, which returns to /auth/callback to complete the exchange.
 *
 * Used directly as a <form action>, so it takes FormData and returns void
 * (redirect throws). `redirectTo` is built from the live request origin, so
 * localhost, preview, and production each round-trip to their own callback —
 * every such origin must be in Supabase's Redirect URLs allowlist.
 */
export async function signInWithProvider(formData: FormData): Promise<void> {
  const provider = String(formData.get("provider") ?? "") as OAuthProvider;
  if (!OAUTH_PROVIDERS.includes(provider)) {
    redirect("/login?error=oauth");
  }

  // Only same-origin relative paths — never trust this as an absolute URL.
  const nextRaw = String(formData.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ??
    `https://${hdrs.get("x-forwarded-host") ?? hdrs.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Emails a password-reset link. The link redeems its recovery token at
 * /auth/confirm (verifyOtp), which lands the user on /reset-password with a
 * short-lived recovery session where updatePassword() below can run.
 *
 * The response is deliberately identical whether or not the address has an
 * account, so this can't be used to probe which emails are registered.
 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };

  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ??
    `https://${hdrs.get("x-forwarded-host") ?? hdrs.get("host")}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  return {
    message: "If that email has an account, a reset link is on its way.",
  };
}

/**
 * Sets a new password for the user in the current (recovery) session — reached
 * from /reset-password after the emailed link established the session.
 */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) {
    return { error: "Choose a password of at least 6 characters." };
  }
  if (password !== confirm) {
    return { error: "The passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/");
}
