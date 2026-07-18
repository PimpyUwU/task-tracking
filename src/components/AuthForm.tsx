"use client";

import { useActionState, useState } from "react";
import {
  signIn,
  signUp,
  signInWithProvider,
  requestPasswordReset,
  type AuthState,
} from "@/app/auth/actions";

const initial: AuthState = {};

type Mode = "in" | "up" | "reset";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.22V7.04H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.05 12.54c-.03-2.53 2.07-3.74 2.16-3.8-1.18-1.72-3.01-1.96-3.66-1.98-1.56-.16-3.04.92-3.83.92-.79 0-2.01-.9-3.31-.87-1.7.02-3.27 1-4.14 2.53-1.77 3.06-.45 7.59 1.27 10.07.84 1.21 1.84 2.57 3.15 2.52 1.26-.05 1.74-.82 3.27-.82 1.52 0 1.95.82 3.28.79 1.36-.02 2.22-1.23 3.05-2.45.96-1.4 1.36-2.76 1.38-2.83-.03-.01-2.65-1.02-2.68-4.04Zm-2.5-7.42c.7-.85 1.17-2.03 1.04-3.2-1.01.04-2.23.67-2.95 1.52-.65.75-1.21 1.95-1.06 3.1 1.12.09 2.27-.57 2.97-1.42Z" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.47c.53.1.72-.23.72-.5v-1.9c-2.92.63-3.54-1.25-3.54-1.25-.48-1.21-1.17-1.54-1.17-1.54-.95-.65.07-.64.07-.64 1.06.07 1.61 1.09 1.61 1.09.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.66-1.4-2.33-.27-4.78-1.17-4.78-5.19 0-1.15.41-2.08 1.09-2.82-.11-.27-.47-1.34.1-2.79 0 0 .88-.28 2.88 1.07a10 10 0 0 1 5.25 0c2-1.35 2.88-1.07 2.88-1.07.57 1.45.21 2.52.1 2.79.68.74 1.09 1.67 1.09 2.82 0 4.03-2.46 4.92-4.8 5.18.38.33.71.97.71 1.96v2.9c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z" />
  </svg>
);

const PROVIDERS = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "apple", label: "Apple", Icon: AppleIcon },
  { id: "github", label: "GitHub", Icon: GitHubIcon },
] as const;

const MailIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);

const LockIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
    <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
    <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.5 0 10 6 10 6a17.8 17.8 0 0 1-3.3 4M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 6 10 6a9.6 9.6 0 0 0 4.2-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M3 3l18 18" />
  </svg>
);

const Arrow = () => (
  <svg className="arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** Password field with a leading lock icon and a show/hide reveal toggle. */
export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  placeholder = "••••••••",
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label block mb-2" htmlFor={id}>
        {label}
      </label>
      <div className="auth-field">
        <LockIcon />
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          className="field auth-input auth-input-reveal"
          placeholder={placeholder}
        />
        <button
          type="button"
          className="auth-reveal"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

const copy: Record<Mode, { label: string; title: string; sub: string; cta: string }> = {
  in: {
    label: "Sign in",
    title: "Welcome back",
    sub: "Sign in to pick up where your timer left off.",
    cta: "Sign in",
  },
  up: {
    label: "Get started",
    title: "Start tracking free",
    sub: "No card needed — your first invoice is minutes away.",
    cta: "Create account",
  },
  reset: {
    label: "Password reset",
    title: "Reset your password",
    sub: "Enter your email and we'll send a secure link to set a new one.",
    cta: "Send reset link",
  },
};

/**
 * The reusable email/password auth form — mode tabs, server actions, and the
 * mode-aware heading. Shared by the hero card's flip face (`compact`) and the
 * standalone /login page so the two experiences stay consistent.
 *
 * Beyond sign in / create account it also carries a `reset` mode (email-only,
 * reached via "Forgot password?"), and the create-account mode confirms the
 * password with a second field. Every password input has a reveal toggle.
 */
export function AuthForm({
  initialMode = "in",
  compact = false,
  initialError,
  next = "/",
}: {
  initialMode?: "in" | "up";
  compact?: boolean;
  /** Error surfaced from a redirect (e.g. ?error=oauth), shown until resubmit. */
  initialError?: string;
  /** Post-login destination, forwarded through the OAuth round-trip. */
  next?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const action =
    mode === "in" ? signIn : mode === "up" ? signUp : requestPasswordReset;
  const [state, formAction, pending] = useActionState(action, initial);
  const t = copy[mode];
  // Show the redirect error until the user submits the form themselves.
  const error = state.error ?? (state === initial ? initialError : undefined);

  // Clearing the password fields on every mode change keeps a typed secret
  // from lingering behind a tab the user switched away from.
  const switchMode = (nextMode: Mode) => {
    setPassword("");
    setConfirm("");
    setMode(nextMode);
  };

  const mismatch = mode === "up" && confirm.length > 0 && password !== confirm;

  return (
    <div className="auth-formbox">
      <div className="rise">
        <p className="label mb-3">{t.label}</p>
        <h2
          className="serif auth-heading"
          style={{
            fontSize: compact ? "clamp(26px,2.4vw,32px)" : "clamp(30px,3.6vw,42px)",
            lineHeight: 1.04,
          }}
        >
          {t.title}
        </h2>
        <p className="text-ink-2 mt-2.5 text-[15px]">{t.sub}</p>
      </div>

      {/* Segmented mode control with a sliding pill (hidden in reset mode). */}
      {mode !== "reset" && (
        <div className={`auth-seg ${compact ? "mt-5" : "mt-7"}`} data-mode={mode} role="tablist" aria-label="Authentication mode">
          <span className="auth-seg-pill" aria-hidden />
          <button
            type="button"
            role="tab"
            aria-selected={mode === "in"}
            data-active={mode === "in"}
            onClick={() => switchMode("in")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "up"}
            data-active={mode === "up"}
            onClick={() => switchMode("up")}
          >
            Create account
          </button>
        </div>
      )}

      <form action={formAction} className={`flex flex-col gap-4 ${compact ? "mt-5" : "mt-6"}`}>
        <div>
          <label className="label block mb-2" htmlFor="email">
            Email
          </label>
          <div className="auth-field">
            <MailIcon />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="field auth-input"
              placeholder="you@studio.com"
            />
          </div>
        </div>

        {mode !== "reset" && (
          <div>
            <PasswordField
              id="password"
              name="password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              minLength={mode === "up" ? 6 : undefined}
            />
            {mode === "up" && (
              <p className="num text-[11px] text-ink-3 mt-1.5">At least 6 characters</p>
            )}
            {mode === "in" && (
              <button
                type="button"
                className="auth-textlink auth-forgot num text-[12px] mt-1.5"
                onClick={() => switchMode("reset")}
              >
                Forgot password?
              </button>
            )}
          </div>
        )}

        {mode === "up" && (
          <div>
            <PasswordField
              id="confirm"
              name="confirm"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              minLength={6}
            />
            {mismatch && (
              <p className="num text-[11px] text-danger mt-1.5" role="alert">
                The passwords don&apos;t match.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="auth-msg auth-msg-error num text-xs" role="alert">
            {error}
          </p>
        )}
        {state.message && (
          <p className="auth-msg num text-xs" role="status">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || mismatch}
          className="btn btn-accent auth-submit justify-center mt-1"
        >
          {pending ? "One moment…" : t.cta}
          {!pending && <Arrow />}
        </button>
      </form>

      {/* Social sign-in and the swap link don't belong in the email-only reset
          flow, so they collapse to a single "back to sign in" link there. */}
      {mode === "reset" ? (
        <p className={`text-[12.5px] text-ink-3 leading-relaxed ${compact ? "mt-4" : "mt-6"}`}>
          Remembered it?{" "}
          <button type="button" className="auth-swaplink" onClick={() => switchMode("in")}>
            Back to sign in
          </button>
        </p>
      ) : (
        <>
          <div className={`auth-divider ${compact ? "my-4" : "my-5"}`}>
            <span>or continue with</span>
          </div>

          <div className="auth-social">
            {PROVIDERS.map(({ id, label, Icon }) => (
              <form key={id} action={signInWithProvider}>
                <input type="hidden" name="provider" value={id} />
                <input type="hidden" name="next" value={next} />
                <button
                  type="submit"
                  className="btn auth-social-btn w-full justify-center"
                  aria-label={`Continue with ${label}`}
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              </form>
            ))}
          </div>

          <p className={`text-[12.5px] text-ink-3 leading-relaxed ${compact ? "mt-4" : "mt-6"}`}>
            By continuing you agree that your data stays yours — FluxWork never sells or
            shares it. {mode === "in" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              className="auth-swaplink"
              onClick={() => switchMode(mode === "in" ? "up" : "in")}
            >
              {mode === "in" ? "Create a free account" : "Sign in instead"}
            </button>
          </p>
        </>
      )}
    </div>
  );
}
