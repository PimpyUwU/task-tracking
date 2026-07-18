"use client";

import { useActionState, useState } from "react";
import { updatePassword, type AuthState } from "@/app/auth/actions";
import { PasswordField } from "@/components/AuthForm";

const initial: AuthState = {};

const Arrow = () => (
  <svg className="arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/**
 * Sets a new password using the recovery session established by the emailed
 * reset link. On success updatePassword() redirects to the app.
 */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, formAction, pending] = useActionState(updatePassword, initial);

  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="auth-formbox">
      <div className="rise">
        <p className="label mb-3">Password reset</p>
        <h2
          className="serif auth-heading"
          style={{ fontSize: "clamp(30px,3.6vw,42px)", lineHeight: 1.04 }}
        >
          Set a new password
        </h2>
        <p className="text-ink-2 mt-2.5 text-[15px]">
          Choose a new password for your FluxWork account.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4 mt-6">
        <div>
          <PasswordField
            id="password"
            name="password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={6}
          />
          <p className="num text-[11px] text-ink-3 mt-1.5">At least 6 characters</p>
        </div>

        <div>
          <PasswordField
            id="confirm"
            name="confirm"
            label="Confirm new password"
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

        {state.error && (
          <p className="auth-msg auth-msg-error num text-xs" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || mismatch}
          className="btn btn-accent auth-submit justify-center mt-1"
        >
          {pending ? "One moment…" : "Update password"}
          {!pending && <Arrow />}
        </button>
      </form>
    </div>
  );
}
