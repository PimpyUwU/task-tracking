/** Formatting helpers for durations. All inputs are whole seconds. */

export function formatDuration(totalSeconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(totalSeconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Decimal hours, Harvest-style (e.g. 1.25h). */
export function formatHours(totalSeconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(totalSeconds ?? 0));
  return (s / 3600).toFixed(2);
}

/** Compact human label, e.g. "2h 05m" or "45m" or "12s". */
export function formatCompact(totalSeconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(totalSeconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function elapsedSeconds(startedAtIso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(startedAtIso).getTime()) / 1000));
}
