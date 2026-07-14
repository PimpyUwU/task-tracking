"use client";

import { useEffect, useState, useTransition } from "react";
import { startTimer, stopTimer } from "@/app/actions/time";
import { formatDuration, elapsedSeconds } from "@/lib/time";

type Props = {
  taskId: string;
  projectId: string;
  /** Running entry for this task, if one exists. */
  running: { id: string; started_at: string } | null;
  /** Completed seconds already logged against this task. */
  loggedSeconds: number;
};

export function Timer({ taskId, projectId, running, loggedSeconds }: Props) {
  const [pending, startTransition] = useTransition();
  const [live, setLive] = useState(() =>
    running ? elapsedSeconds(running.started_at) : 0,
  );

  // Reset the live counter the moment the running entry changes (start/stop/
  // switch) — done during render per React's "adjust state on prop change"
  // guidance, so the effect never sets state synchronously.
  const [prevId, setPrevId] = useState<string | null>(running?.id ?? null);
  const curId = running?.id ?? null;
  if (curId !== prevId) {
    setPrevId(curId);
    setLive(running ? elapsedSeconds(running.started_at) : 0);
  }

  // Tick once per second while running.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => setLive(elapsedSeconds(running.started_at)),
      1000,
    );
    return () => clearInterval(id);
  }, [running]);

  const displaySeconds = loggedSeconds + (running ? live : 0);

  function onStart() {
    startTransition(async () => {
      await startTimer(taskId, projectId);
    });
  }
  function onStop() {
    if (!running) return;
    startTransition(async () => {
      await stopTimer(running.id, projectId);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right tabular-nums min-w-[5.5rem]">
        <span
          className={`num text-lg ${running ? "text-accent" : "text-ink"}`}
          aria-live="polite"
        >
          {formatDuration(displaySeconds)}
        </span>
      </div>

      {running ? (
        <button
          onClick={onStop}
          disabled={pending}
          className="btn btn-accent min-w-[6rem] justify-center"
        >
          <span className="live-dot" aria-hidden />
          Stop
        </button>
      ) : (
        <button
          onClick={onStart}
          disabled={pending}
          className="btn min-w-[6rem] justify-center"
        >
          {pending ? "…" : "Start"}
        </button>
      )}
    </div>
  );
}
