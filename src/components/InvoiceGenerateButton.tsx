"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateInvoice } from "@/app/actions/invoices";

/**
 * Final step of the invoice flow: submits the previewed selection to the
 * generateInvoice action, then moves to the success state (?done=<id>).
 */
export function InvoiceGenerateButton({
  clientId,
  projectId,
}: {
  clientId: string;
  projectId?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await generateInvoice(formData);
      if (res && "error" in res) {
        setError(res.error ?? "Couldn't generate the invoice.");
        return;
      }
      router.push(`/invoices?done=${res.id}`);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="client_id" value={clientId} />
      {projectId && <input type="hidden" name="project_id" value={projectId} />}
      <button type="submit" className="btn btn-accent" disabled={pending}>
        {pending ? "Generating…" : "Generate invoice"}
      </button>
      {error && <p className="num text-xs text-accent">{error}</p>}
    </form>
  );
}
