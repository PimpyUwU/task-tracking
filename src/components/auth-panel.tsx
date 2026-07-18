"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Wordmark } from "@/components/Wordmark";

type Mode = "in" | "up";

/**
 * The dark editorial panel of the login design — cursor-following spotlight,
 * blueprint grid, product checklist. The left column of the /login page.
 */
export function AuthAside({ brand = false }: { brand?: boolean }) {
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <aside className="auth-aside" onMouseMove={onMove}>
      {brand && (
        <div className="auth-aside-top">
          <Link href="/welcome" className="auth-brand">
            <Wordmark />
          </Link>
        </div>
      )}
      <div className="auth-aside-mid">
        <p className="label auth-aside-kicker mb-5">01 — Precision timekeeping</p>
        <h1 className="serif" style={{ fontSize: "clamp(34px,3.4vw,50px)", lineHeight: 1.03 }}>
          Track time
          <br />
          like an
          <br />
          <em className="italic auth-aside-em">instrument.</em>
        </h1>
        <p className="auth-aside-body mt-5 max-w-sm text-[14.5px] leading-relaxed">
          Project, task, entry. Overlapping timers, exact roll-ups, no clutter.
          Every billable minute lands on the invoice by itself.
        </p>
      </div>
      <ul className="auth-aside-list">
        {[
          "Billable / non-billable, split at the source",
          "Rates locked onto every invoice at generation",
          "DOCX + PDF export — your data stays yours",
        ].map((line) => (
          <li key={line}>
            <span className="auth-tick" aria-hidden />
            {line}
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * The split layout of the /login page: the dark editorial column beside the
 * email/password + OAuth form. `topRight` is the "back to site" link.
 */
export function AuthContent({
  mode = "in",
  topRight,
  initialError,
}: {
  mode?: Mode;
  topRight?: ReactNode;
  initialError?: string;
}) {
  return (
    <div className="auth-content">
      <AuthAside brand />
      <div className="auth-formwrap">
        {topRight && <div className="auth-topright">{topRight}</div>}
        <AuthForm key={mode} initialMode={mode} initialError={initialError} />
      </div>
    </div>
  );
}
