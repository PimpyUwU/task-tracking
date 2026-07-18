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
import { motion, MotionConfig } from "motion/react";
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

/* One spring family for the whole auth takeover — a decisive, natural settle
   with zero 3D rotation, so text never blurs mid-flight. */
const SWAP = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const;

/**
 * Owns the open/closed state for the in-place login and wires it to the
 * browser: Escape and the Back button close it, opening shallow-pushes /login
 * so the URL tracks what's shown, and the body scroll locks while the
 * full-screen login is up. The landing stays mounted underneath — the login
 * panel simply slides over it.
 */
export function AuthOverlayProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("in");
  // Mirrors isOpen for event handlers — history.pushState must never run
  // inside a state updater (it re-enters the Next router mid-render).
  const openRef = useRef(false);

  const open = useCallback((next: Mode) => {
    setMode(next);
    if (!openRef.current) {
      // Shallow-push /login so the takeover reads as a navigation: the URL
      // changes, and Back returns to /welcome (restoring the landing).
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

  // History traversal keeps the page in sync both ways: Back restores the
  // landing, Forward onto our pushed /login entry reopens the login.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const next = Boolean(e.state?.fluxAuth);
      openRef.current = next;
      setIsOpen(next);
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

  // Lock the page behind the takeover so a stray scroll can't drift the
  // landing while the login is up.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <AuthCtx.Provider value={{ isOpen, mode, open, close }}>
        {children}
        <AuthOverlay />
      </AuthCtx.Provider>
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

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/**
 * The full-screen split login that slides over the landing when any auth CTA
 * is clicked — the same design as the standalone /login page. The dark
 * editorial column enters from the left, the form column from the right, so
 * the two halves assemble around the form the user is about to fill in.
 */
function AuthOverlay() {
  const { isOpen, mode, close } = useAuthOverlay();
  const formRef = useRef<HTMLDivElement>(null);

  // Focus the first field once the panel has settled in.
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => {
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus({
        preventScroll: true,
      });
    }, 360);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  return (
    <motion.div
      className="auth-overlay"
      initial={false}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{ duration: isOpen ? 0.28 : 0.22, ease: "easeOut" }}
      data-open={isOpen}
      inert={!isOpen}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to FluxWork"
    >
      <div className="auth-content">
        <motion.div
          className="auth-overlay-aside"
          initial={false}
          animate={isOpen ? { x: 0, opacity: 1 } : { x: "-4%", opacity: 0 }}
          transition={SWAP}
        >
          <AuthAside brand />
        </motion.div>

        <motion.div
          ref={formRef}
          className="auth-formwrap"
          initial={false}
          animate={isOpen ? { x: 0, opacity: 1 } : { x: "4%", opacity: 0 }}
          transition={isOpen ? { ...SWAP, delay: 0.05 } : SWAP}
        >
          <div className="auth-topright">
            <button
              type="button"
              className="auth-close auth-close-wide"
              onClick={close}
              aria-label="Close sign in"
            >
              <CloseIcon /> Back to site
            </button>
          </div>
          {/* Keyed on mode + open so each open honors the clicked CTA's mode
              and resets the form state from the previous session. */}
          <AuthForm key={`${mode}:${isOpen}`} initialMode={mode} />
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * The dark editorial panel of the login design — cursor-following spotlight,
 * blueprint grid, product checklist. Shared by the in-place overlay and the
 * standalone /login page's left column.
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
 * The split layout of the standalone /login page (direct loads, e.g. after
 * sign-out). Shares AuthAside + AuthForm with the in-place overlay so the two
 * experiences are pixel-identical. `topRight` is the "back to site" link.
 */
export function AuthContent({
  mode = "in",
  topRight,
  initialError,
}: {
  mode?: Mode;
  topRight?: ReactNode;
  /** Error surfaced from a redirect (e.g. ?error=oauth), shown until resubmit. */
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
