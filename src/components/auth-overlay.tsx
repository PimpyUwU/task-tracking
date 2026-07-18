"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { animate, motion, MotionConfig } from "motion/react";
import { AuthForm } from "@/components/AuthForm";
import { Wordmark } from "@/components/Wordmark";

type Mode = "in" | "up";

type Ctx = {
  isOpen: boolean;
  mode: Mode;
  open: (mode: Mode) => void;
  close: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);

function useAuthOverlay() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuthOverlay must be used within <AuthOverlayProvider>");
  return ctx;
}

/* One spring family for the whole auth transition — a decisive, natural
   settle with zero 3D rotation, so text never goes blurry mid-flight. */
const SWAP = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const;

let scrollAnim: { stop: () => void } | null = null;

/**
 * Spring-glides the page scroll to a target. Starts immediately and rides
 * along document-height changes (the browser clamps out-of-range frames),
 * so collapse/expand and scrolling read as one continuous motion.
 * The user can take over at any time — a wheel or touch cancels it.
 */
function glideTo(targetY: number) {
  scrollAnim?.stop();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: targetY, behavior: "instant" });
    return;
  }
  const handOver = () => scrollAnim?.stop();
  window.addEventListener("wheel", handOver, { once: true, passive: true });
  window.addEventListener("touchstart", handOver, { once: true, passive: true });
  scrollAnim = animate(window.scrollY, targetY, {
    type: "spring",
    stiffness: 110,
    damping: 22,
    mass: 0.9,
    restDelta: 0.5,
    // "instant" bypasses the CSS scroll-behavior: smooth on <html>.
    onUpdate: (v) => window.scrollTo({ top: v, behavior: "instant" }),
  });
}

/** Tracks the desktop hero breakpoint (side-by-side hero columns). */
function useDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

/**
 * Owns the open/closed state for the in-place login and wires it to the
 * browser: Escape and the Back button close it, and opening shallow-pushes
 * /login so the URL tracks what the page is showing. The landing page itself
 * rebuilds into the login layout — nothing is overlaid.
 */
export function AuthOverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("in");
  // Mirrors isOpen for event handlers — history.pushState must never run
  // inside a state updater (it re-enters the Next router mid-render).
  const openRef = useRef(false);
  // Where the user was before opening — restored on close. We drive this
  // ourselves (scrollRestoration: manual) because the browser's restore
  // fires while the page is still collapsed and gets clamped.
  const returnScroll = useRef<number | null>(null);

  const open = useCallback((next: Mode) => {
    setMode(next);
    if (!openRef.current) {
      returnScroll.current = window.scrollY;
      // Shallow-push /login so the in-place rebuild reads as a navigation:
      // the URL changes, and Back returns to /welcome (restoring the landing).
      window.history.pushState({ fluxAuth: true }, "", "/login");
      openRef.current = true;
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    if (window.history.state?.fluxAuth) {
      // Pop our pushed entry; the popstate handler flips isOpen off.
      window.history.back();
    } else {
      openRef.current = false;
      setIsOpen(false);
    }
  }, []);

  // We animate the return scroll ourselves — the browser's own popstate
  // restore would jump-cut against the expanding page.
  useEffect(() => {
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = prev;
    };
  }, []);

  // History traversal keeps the page in sync both ways: Back restores the
  // landing, Forward onto our pushed /login entry restores the login.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const open = Boolean(e.state?.fluxAuth);
      openRef.current = open;
      setIsOpen(open);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Escape closes.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // On close, glide straight back to where the user was — in parallel with
  // the sections re-expanding, so there's no pause before the return trip.
  useEffect(() => {
    if (isOpen) return;
    const y = returnScroll.current;
    if (y == null) return;
    returnScroll.current = null;
    glideTo(y);
  }, [isOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <AuthCtx.Provider value={{ isOpen, mode, open, close }}>{children}</AuthCtx.Provider>
    </MotionConfig>
  );
}

/** A button that opens the in-place login in a given mode. Drops into server markup. */
export function AuthTrigger({
  mode = "in",
  className,
  style,
  children,
}: {
  mode?: Mode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { open } = useAuthOverlay();
  return (
    <button type="button" className={className} style={style} onClick={() => open(mode)}>
      {children}
    </button>
  );
}

/**
 * Wraps everything below the hero. While login is open these sections
 * collapse to zero height and fade out, so the page IS the login page —
 * nav + hero only. Expands back when login closes.
 */
export function AuthCollapse({ children }: { children: ReactNode }) {
  const { isOpen } = useAuthOverlay();
  return (
    <div className="auth-collapse" data-collapsed={isOpen} inert={isOpen} aria-hidden={isOpen}>
      <div>{children}</div>
    </div>
  );
}

/** Fades its children out (and makes them inert) while login is open. */
export function AuthHide({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { isOpen } = useAuthOverlay();
  return (
    <div className={`auth-hide ${className}`} data-hidden={isOpen} inert={isOpen} aria-hidden={isOpen}>
      {children}
    </div>
  );
}

/**
 * Two stacked faces in one grid cell: the landing content (children) in
 * front, the login counterpart behind. Opening login spring-crossfades
 * front → back in place, so the column rebuilds without the layout moving.
 * On small screens the back face is skipped — the headline just recedes.
 */
export function AuthSwap({
  children,
  back,
  className = "",
}: {
  children: ReactNode;
  back: ReactNode;
  className?: string;
}) {
  const { isOpen } = useAuthOverlay();
  const desktop = useDesktop();
  return (
    <div className={`auth-swap ${className}`} data-open={isOpen}>
      <motion.div
        className="auth-swap-front"
        initial={false}
        animate={
          isOpen
            ? desktop
              ? { opacity: 0, y: -18, scale: 0.985 }
              : { opacity: 0.35, y: 0, scale: 1 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={SWAP}
        inert={isOpen}
        aria-hidden={isOpen}
      >
        {children}
      </motion.div>
      <motion.div
        className="auth-swap-back"
        initial={false}
        animate={
          isOpen && desktop
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 18, scale: 0.99 }
        }
        transition={isOpen ? { ...SWAP, delay: 0.08 } : SWAP}
        inert={!isOpen}
        aria-hidden={!isOpen}
      >
        {back}
      </motion.div>
    </div>
  );
}

/**
 * The hero's other shared element: the live app-preview card (server-
 * rendered children) on the front face, the auth form on the back.
 * Clicking any auth CTA swaps the card in place with a spring crossfade.
 */
export function HeroAuthCard({ children }: { children: ReactNode }) {
  const { isOpen, mode, close } = useAuthOverlay();
  const ref = useRef<HTMLDivElement>(null);

  // On open: glide the form into view (top of page on desktop where both
  // hero columns are visible; the card itself on small screens, where it
  // sits below the tall headline), then focus the first field once the
  // swap settles.
  useEffect(() => {
    if (!isOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    let target = 0;
    if (!desktop && ref.current) {
      const r = ref.current.getBoundingClientRect();
      target = Math.max(
        0,
        window.scrollY + r.top - Math.max(24, (window.innerHeight - r.height) / 2),
      );
    }
    glideTo(target);
    const id = window.setTimeout(() => {
      ref.current?.querySelector<HTMLInputElement>(".auth-face-auth input")?.focus({
        preventScroll: true,
      });
    }, 420);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  return (
    <div ref={ref} className="auth-flip" data-open={isOpen}>
      <motion.div
        className="auth-face auth-face-preview"
        initial={false}
        animate={
          isOpen
            ? { opacity: 0, y: -12, scale: 0.965 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={SWAP}
        inert={isOpen}
        aria-hidden={isOpen}
      >
        {children}
      </motion.div>
      <motion.div
        className="auth-face auth-face-auth panel"
        initial={false}
        animate={
          isOpen
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 16, scale: 0.975 }
        }
        transition={isOpen ? { ...SWAP, delay: 0.07 } : SWAP}
        inert={!isOpen}
        aria-hidden={!isOpen}
        role="region"
        aria-label="Sign in to FluxWork"
      >
        <button type="button" className="auth-close" onClick={close} aria-label="Close sign in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        {/* Keyed on open state too, so every open honors the clicked CTA's
            mode even if the user switched modes inside the form last time. */}
        <AuthForm key={`${mode}:${isOpen}`} initialMode={mode} compact />
      </motion.div>
    </div>
  );
}

/**
 * The dark editorial panel of the login design — cursor-following spotlight,
 * blueprint grid, product checklist. Used as the hero headline's back face
 * on /welcome (`hero`) and as the left column of the standalone /login page.
 */
export function AuthAside({
  brand = false,
  hero = false,
}: {
  brand?: boolean;
  hero?: boolean;
}) {
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <aside className={`auth-aside ${hero ? "auth-aside-hero" : ""}`} onMouseMove={onMove}>
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
 * The split layout of the standalone /login page (direct loads, e.g. after
 * sign-out). `topRight` is the "back to site" link.
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
