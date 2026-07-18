"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Motion primitives for the marketing landing page (/welcome).
 * All scroll effects are IntersectionObserver-driven and degrade to static
 * content under prefers-reduced-motion (handled in globals.css for the CSS
 * side, and checked here for the JS side).
 */

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fades + rises children into view once, when scrolled into the viewport. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already in view — or above it (anchor jump, scroll-up) — reveal now.
    // The class lands after first paint, so the entrance still transitions.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      el.classList.add("io-in");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("io-in");
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`io ${className}`}
      style={{ "--rv": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Counts a number up from 0 when it enters the viewport. */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1400,
  className,
  style,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();
        if (reducedMotion()) {
          setDisplay(value);
          return;
        }
        let t0: number | null = null;
        const tick = (t: number) => {
          if (t0 === null) t0 = t;
          const p = Math.min(1, Math.max(0, (t - t0) / duration));
          const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
          setDisplay(value * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/**
 * The dark running-timer dock inside the hero app preview — actually ticks,
 * accruing time and money every second. The product's core promise, animated.
 */
export function TimerDock({
  startSeconds = 4360, // 01:12:40
  ratePerHour = 84,
  project = "Northwind",
}: {
  startSeconds?: number;
  ratePerHour?: number;
  project?: string;
}) {
  const [seconds, setSeconds] = useState(startSeconds);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const earned = (seconds * ratePerHour) / 3600;

  return (
    <div className="flex items-center gap-3 px-4 py-3 panel-dark rounded-none">
      <span className="live-dot" />
      <span className="num font-semibold text-[15px] text-on-dark">
        {hh}:{mm}:{ss}
      </span>
      <span className="text-xs text-on-dark/60">{project}</span>
      <span className="num font-semibold text-d-brass text-[13px] ml-auto">
        +${earned.toFixed(2)}
      </span>
      <span className="btn btn-teal btn-sm">Stop</span>
    </div>
  );
}
