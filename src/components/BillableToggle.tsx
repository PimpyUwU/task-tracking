"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEntryBillable } from "@/app/actions/time";

/** Compact toggle for a single time entry's billability. */
export function BillableToggle({
  entryId,
  projectId,
  isBillable,
}: {
  entryId: string;
  projectId: string;
  isBillable: boolean;
}) {
  const [billable, setBillable] = useState(isBillable);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !billable;
    setBillable(next); // optimistic
    startTransition(async () => {
      const res = await setEntryBillable(entryId, projectId, next);
      if (res?.error) {
        setBillable(!next); // revert
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={billable ? "Billable — click to exclude" : "Non-billable — click to include"}
      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-[var(--radius)] border transition-colors"
      style={{
        borderColor: billable ? "var(--color-accent)" : "var(--color-line-strong)",
        color: billable ? "var(--color-accent)" : "var(--color-ink-3)",
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: billable ? "var(--color-accent)" : "var(--color-ink-3)",
        }}
      />
      {billable ? "Billable" : "Non-billable"}
    </button>
  );
}
