"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

const initial: AuthState = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="min-h-[calc(100vh-3.5rem)] grid md:grid-cols-2">
        {/* Left: editorial statement */}
        <section className="hidden md:flex flex-col justify-between py-16 pr-12 border-r border-line">
          <div className="rise">
            <p className="label mb-6">01 — Precision timekeeping</p>
            <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight">
              Track time
              <br />
              like an
              <br />
              <span className="num text-accent">instrument.</span>
            </h1>
          </div>
          <p className="text-ink-2 max-w-sm text-sm leading-relaxed">
            Project, task, entry. Overlapping timers, exact roll-ups, no clutter.
            Built on a strict grid — nothing you don&apos;t need.
          </p>
        </section>

        {/* Right: auth */}
        <section className="flex flex-col justify-center py-16 md:pl-12">
          <div className="w-full max-w-sm rise">
            <div className="flex gap-6 mb-8">
              <button
                onClick={() => setMode("in")}
                className={`label pb-1 transition-colors ${
                  mode === "in"
                    ? "text-ink border-b border-ink"
                    : "hover:text-ink"
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => setMode("up")}
                className={`label pb-1 transition-colors ${
                  mode === "up"
                    ? "text-ink border-b border-ink"
                    : "hover:text-ink"
                }`}
              >
                Create account
              </button>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <div>
                <label className="label block mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="field"
                  placeholder="you@studio.com"
                />
              </div>
              <div>
                <label className="label block mb-2" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "in" ? "current-password" : "new-password"
                  }
                  required
                  className="field"
                  placeholder="••••••••"
                />
              </div>

              {state.error && (
                <p className="num text-xs text-accent">{state.error}</p>
              )}
              {state.message && (
                <p className="num text-xs text-ink-2">{state.message}</p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="btn btn-accent justify-center mt-2"
              >
                {pending
                  ? "…"
                  : mode === "in"
                    ? "Sign in →"
                    : "Create account →"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
