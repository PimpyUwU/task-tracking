"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  action: () => Promise<unknown>;
  label: string;
  confirmLabel?: string;
  className?: string;
};

/**
 * Two-click confirm button. Avoids native confirm() dialogs (which block the
 * page) — first click arms, second click within 3s runs the bound server action.
 */
export function ConfirmAction({
  action,
  label,
  confirmLabel = "Confirm?",
  className = "btn",
}: Props) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onClick() {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
    startTransition(async () => {
      await action();
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`${className} ${armed ? "btn-accent" : ""}`}
    >
      {pending ? "…" : armed ? confirmLabel : label}
    </button>
  );
}
