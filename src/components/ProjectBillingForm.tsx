"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProjectBilling } from "@/app/actions/projects";

type ClientOption = { id: string; name: string };

export function ProjectBillingForm({
  projectId,
  clients,
  currentClientId,
  currentRate,
}: {
  projectId: string;
  clients: ClientOption[];
  currentClientId: string | null;
  currentRate: number | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    const clientId = String(formData.get("client_id") ?? "").trim() || null;
    startTransition(async () => {
      const res = await updateProjectBilling(projectId, clientId, formData);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      action={onSubmit}
      className="border border-line rounded-md p-5 flex flex-col gap-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label block mb-2">Client</label>
          {clients.length === 0 ? (
            <input className="field" placeholder="No clients yet" disabled />
          ) : (
            <select
              name="client_id"
              className="field"
              defaultValue={currentClientId ?? ""}
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="label block mb-2">Rate / hour (override)</label>
          <input
            name="rate"
            inputMode="decimal"
            className="field num"
            placeholder="Inherits client rate"
            defaultValue={currentRate ?? ""}
          />
        </div>
      </div>

      {error && <p className="num text-xs text-accent">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn">
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && !pending && (
          <span className="text-xs text-ink-3">Saved.</span>
        )}
      </div>
    </form>
  );
}
