"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { updatePassword, type AuthState } from "@/app/auth/actions";
import { PASSWORD_MIN_LENGTH, evaluatePassword } from "@/lib/passwordPolicy";

const initial: AuthState = {};

const LockIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
    <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

const Arrow = () => (
  <svg className="arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/**
 * Set-a-new-password form, shown on /reset-password after the recovery link
 * established a session. Mirrors the sign-up strength meter so the live rules
 * match the server's authoritative check in updatePassword.
 */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [state, formAction, pending] = useActionState(updatePassword, initial);

  const checks = useMemo(() => evaluatePassword(password), [password]);
  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <div className="auth-formbox">
      <div className="rise">
        <p className="label mb-3">Reset password</p>
        <h2 className="serif auth-heading" style={{ fontSize: "clamp(30px,3.6vw,42px)", lineHeight: 1.04 }}>
          Set a new password
        </h2>
        <p className="text-ink-2 mt-2.5 text-[15px]">
          Choose a strong password — you&apos;ll be signed in right after.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4 mt-6">
        <div>
          <label className="label block mb-2" htmlFor="password">
            New password
          </label>
          <div className="auth-field">
            <LockIcon />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              required
              minLength={PASSWORD_MIN_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field auth-input"
              placeholder="••••••••"
            />
          </div>
          <div className="auth-pwmeter mt-2.5" aria-live="polite">
            <div className="auth-pwbar" data-strength={passedCount}>
              {checks.map((c) => (
                <span key={c.id} data-on={c.passed} />
              ))}
            </div>
            <ul className="auth-pwrules num">
              {checks.map((c) => (
                <li key={c.id} data-on={c.passed}>
                  <span aria-hidden>{c.passed ? "✓" : "•"}</span>
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {state.error && (
          <p className="auth-msg auth-msg-error num text-xs" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn btn-accent auth-submit justify-center mt-1"
        >
          {pending ? "Saving…" : "Update password"}
          {!pending && <Arrow />}
        </button>
      </form>

      <p className="text-[12.5px] text-ink-3 leading-relaxed mt-6">
        Link expired or something off?{" "}
        <Link className="auth-swaplink" href="/login">
          Request a new one from sign-in
        </Link>
      </p>
    </div>
  );
}
