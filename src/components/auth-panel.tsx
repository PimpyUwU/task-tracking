"use client";

import Link from "next/link";
import { useCallback, type MouseEvent, type ReactNode } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Wordmark } from "@/components/Wordmark";

type Mode = "in" | "up";

/**
 * The dark editorial panel of the login design — cursor-following spotlight,
 * blueprint grid, product checklist. The left column of the /login page.
 *
 * Carries an iPadOS-style pointer via the `ipad-cursor` library, scoped to this
 * panel: initCursor on enter, disposeCursor on leave, so the OS cursor is only
 * replaced while the pointer is over the dark column. Elements tagged
 * `data-cursor="block"` (the logo) make the pointer morph and wrap them, iPad
 * style. onMove still feeds --lx/--ly (px) to the ambient spotlight glow.
 */
export function AuthAside({ brand = false }: { brand?: boolean }) {
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    // Pixel coords drive the ambient glow's transform (smooth, GPU-composited
    // follow), mirroring how the ipad-cursor library eases its own movement.
    el.style.setProperty("--lx", `${e.clientX - r.left}px`);
    el.style.setProperty("--ly", `${e.clientY - r.top}px`);
  };

  const onEnter = useCallback(async () => {
    const { initCursor } = await import("ipad-cursor");
    initCursor({
      // Roomier box when the pointer melds into a control (e.g. the logo).
      blockPadding: 14,
      enableAutoTextCursor: false,
      normalStyle: {
        width: "26px",
        height: "20px",
        radius: "999px",
        background: "rgba(89, 199, 193, 0.14)",
        border: "1px solid rgba(89, 199, 193, 0.5)",
        durationPosition: "0.12s",
      },
      blockStyle: {
        radius: "auto",
        background: "rgba(89, 199, 193, 0.12)",
        border: "1px solid rgba(89, 199, 193, 0.32)",
      },
    });
  }, []);

  const onLeave = useCallback(async () => {
    const { disposeCursor } = await import("ipad-cursor");
    disposeCursor();
  }, []);

  return (
    <aside className="auth-aside" onMouseMove={onMove} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {brand && (
        <div className="auth-aside-top">
          <Link href="/welcome" className="auth-brand" data-cursor="block">
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
