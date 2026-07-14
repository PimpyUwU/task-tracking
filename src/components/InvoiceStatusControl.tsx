"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInvoiceStatus } from "@/app/actions/invoices";

const STATUSES = ["draft", "sent", "paid", "void"] as const;

export function InvoiceStatusControl({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onChange(next: string) {
    const prev = value;
    setValue(next);
    startTransition(async () => {
      const res = await updateInvoiceStatus(invoiceId, next);
      if (res?.error) {
        setValue(prev);
        return;
      }
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2">
      <span className="label">Status</span>
      <select
        className="field w-auto py-1.5"
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
