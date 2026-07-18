"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/analytics";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/authProviders";
import { validatePassword } from "@/lib/passwordPolicy";

export type AuthState = { error?: string; message?: string };

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

  if (!email) {
    return { error: "Email is required." };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
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

/**
 * Send a password-reset email. Supabase mints a `recovery` token and fires our
 * Send Email hook (see src/lib/authEmail.ts), whose link lands at /auth/confirm
 * → verifyOtp → `redirectTo`. We always report a neutral success so the form
 * never reveals whether an address has an account.
 */
export async function resetPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email to reset your password." };
  }

  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ??
    `https://${hdrs.get("x-forwarded-host") ?? hdrs.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  // Surface only true configuration failures; keep account existence private.
  if (error && error.status && error.status >= 500) {
    return { error: error.message };
  }

  return { message: "If that email has an account, a reset link is on its way." };
}

/**
 * Set a new password. Runs after the recovery link established a session at
 * /auth/confirm; without that session Supabase rejects the update, which we
 * surface as an expired-link error.
 */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error:
        "Couldn't update your password. Your reset link may have expired — request a new one.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
