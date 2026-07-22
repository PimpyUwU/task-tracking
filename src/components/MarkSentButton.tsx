"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInvoiceStatus } from "@/app/actions/invoices";

/** One-tap "Mark as sent" for the invoice success state. */
export function MarkSentButton({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (status !== "draft") {
    return <span className="text-sm text-ink-2">Marked as {status}</span>;
  }

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await updateInvoiceStatus(invoiceId, "sent");
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className="btn" onClick={onClick} disabled={pending}>
        {pending ? "Marking…" : "Mark as sent"}
      </button>
      {error && <p className="num text-xs text-accent">{error}</p>}
    </>
  );
}
