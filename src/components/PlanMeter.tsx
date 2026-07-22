/**
 * Plan usage surfaces — the wall made visible before it's hit (plan §9).
 * `bar` is the full quota meter on the Plan page; `inline` is the quiet counter
 * shown next to a create action as the free ceiling nears. Counts only, so plain
 * `.num` — no currency. The fill turns brass at the ceiling to say "you're full".
 */
type MeterVariant = "bar" | "inline";

export function PlanMeter({
  label,
  used,
  limit,
  variant = "bar",
}: {
  label: string;
  used: number;
  limit: number;
  variant?: MeterVariant;
}) {
  const unlimited = !Number.isFinite(limit);
  const atLimit = !unlimited && used >= limit;
  const pct = unlimited || limit <= 0 ? 0 : Math.min(100, (used / limit) * 100);
  const count = unlimited ? String(used) : `${used} of ${limit}`;

  if (variant === "inline") {
    return (
      <span
        className="num text-xs"
        style={{ color: atLimit ? "var(--brass-ink)" : "var(--ink-3)" }}
      >
        {count} free {label}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="num text-sm text-ink-2">
          {unlimited ? "Unlimited" : count}
        </span>
      </div>
      {!unlimited && (
        <div className="split">
          <i
            className="bill"
            style={{
              width: `${pct}%`,
              background: atLimit ? "var(--brass)" : undefined,
            }}
          />
        </div>
      )}
    </div>
  );
}

/** A paid-only capability row — brass "Pro" when locked, green when included. */
export function PlanFeature({
  label,
  unlocked,
}: {
  label: string;
  unlocked: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <span className={`badge ${unlocked ? "badge-bill" : "badge-norate"}`}>
        Pro
      </span>
    </div>
  );
}
