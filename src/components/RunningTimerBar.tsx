"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { stopTimer } from "@/app/actions/time";
import { formatDuration, elapsedSeconds } from "@/lib/time";
import { formatMoney } from "@/lib/invoice";

export type RunningEntry = {
  entryId: string;
  projectId: string;
  taskName: string;
  projectName: string;
  clientName: string | null;
  startedAt: string;
  isBillable: boolean;
  rate: number | null;
  currency: string;
};

/**
 * Always-reachable timer control. Sticks to the top of every app screen so the
 * two core moments — start/stop and watching money accrue — are never hunted for.
 */
export function RunningTimerBar({ running }: { running: RunningEntry | null }) {
  const [pending, startTransition] = useTransition();
  const [live, setLive] = useState(() =>
    running ? elapsedSeconds(running.startedAt) : 0,
  );

  // Reset the live counter when the running entry changes — during render, so
  // the effect never calls setState synchronously (React guidance).
  const [prevId, setPrevId] = useState<string | null>(running?.entryId ?? null);
  const curId = running?.entryId ?? null;
  if (curId !== prevId) {
    setPrevId(curId);
    setLive(running ? elapsedSeconds(running.startedAt) : 0);
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => setLive(elapsedSeconds(running.startedAt)),
      1000,
    );
    return () => clearInterval(id);
  }, [running]);

  const wrap =
    "sticky top-14 md:top-0 z-30 backdrop-blur-sm";

  if (!running) {
    return (
      <div className={wrap}>
        <div className="timerbar timerbar-idle">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full bg-ink-3 shrink-0"
          />
          <span className="text-sm text-ink-3">No timer running</span>
          <span className="ml-auto text-xs text-ink-3">
            Start one from a project →
          </span>
        </div>
      </div>
    );
  }

  const accrued =
    running.isBillable && running.rate
      ? formatMoney((live / 3600) * running.rate, running.currency)
      : null;

  return (
    <div className={wrap}>
      <div className="timerbar">
        <span className="live-dot shrink-0" aria-hidden />
        <Link
          href={`/projects/${running.projectId}`}
          className="min-w-0 group"
        >
          <div className="text-sm font-semibold truncate text-on-dark group-hover:text-d-teal transition-colors">
            {running.taskName}
          </div>
          <div className="text-[0.7rem] text-on-dark/60 truncate">
            {running.projectName}
            {running.clientName ? ` · ${running.clientName}` : ""}
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <div
              className="num text-xl md:text-2xl text-on-dark leading-none"
              aria-live="polite"
            >
              {formatDuration(live)}
            </div>
            <div className="num text-[0.7rem] mt-1">
              {accrued ? (
                <span className="text-d-brass">+{accrued} · billable</span>
              ) : (
                <span className="text-on-dark/50">non-billable</span>
              )}
            </div>
          </div>
          <button
            onClick={() =>
              startTransition(async () => {
                await stopTimer(running.entryId, running.projectId);
              })
            }
            disabled={pending}
            className="btn btn-teal btn-sm shrink-0"
          >
            <span className="inline-block h-2 w-2 bg-current" aria-hidden />
            {pending ? "…" : "Stop"}
          </button>
        </div>
      </div>
    </div>
  );
}
