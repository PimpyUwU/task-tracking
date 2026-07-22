"use client";

import { useRef, useState, useTransition } from "react";
import { createProject } from "@/app/actions/projects";
import { InlineClientForm } from "@/components/InlineClientForm";

const SWATCHES = ["#ff3b00", "#111012", "#1f6feb", "#1a7f5a", "#9a6dff", "#d4a017"];

type ClientOption = { id: string; name: string };

export function ProjectForm({
  clients = [],
  variant = "primary",
  usageHint,
}: {
  clients?: ClientOption[];
  /** "ghost" demotes the trigger where the timer is the primary action. */
  variant?: "primary" | "ghost";
  /** Quiet counter shown under the trigger near a free-tier limit, e.g. "4 of 5 free projects". */
  usageHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(SWATCHES[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // A client created inline is added here and pre-selected, so the project can
  // be linked without leaving the form (plan §6 Flow 5).
  const [clientList, setClientList] = useState<ClientOption[]>(clients);
  const [selectedClientId, setSelectedClientId] = useState("");

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("color", color);
    startTransition(async () => {
      const res = await createProject(formData);
      if (res && "error" in res) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      formRef.current?.reset();
      setSelectedClientId("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <button
          className={variant === "ghost" ? "btn btn-ghost" : "btn btn-accent"}
          onClick={() => setOpen(true)}
        >
          + New project
        </button>
        {usageHint && <p className="num text-xs text-ink-3">{usageHint}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        ref={formRef}
        action={onSubmit}
        className="rise border border-line-strong bg-paper-2 p-5 flex flex-col gap-4"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label block mb-2">Project name</label>
            <input name="name" required className="field" placeholder="Redesign" autoFocus />
          </div>
          <div>
            <label className="label block mb-2">Client</label>
            {clientList.length === 0 ? (
              <input className="field" placeholder="No clients yet — add one below" disabled />
            ) : (
              <select
                name="client_id"
                className="field"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">No client</option>
                {clientList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="label block mb-2">Code</label>
            <input name="code" className="field" placeholder="ACM-01" />
          </div>
          <div>
            <label className="label block mb-2">Rate / hour (override)</label>
            <input
              name="rate"
              inputMode="decimal"
              className="field num"
              placeholder="Inherits client rate"
            />
          </div>
          <div>
            <label className="label block mb-2">Color</label>
            <div className="flex items-center gap-2 h-[2.35rem]">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`color ${c}`}
                  className="h-6 w-6 border transition-transform"
                  style={{
                    background: c,
                    borderColor: color === c ? "var(--color-ink)" : "transparent",
                    transform: color === c ? "scale(1.12)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {error && <p className="num text-xs text-accent">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn btn-accent">
            {pending ? "Saving…" : "Create"}
          </button>
          <button type="button" className="btn" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>

      {/* Just-in-time client creation. Sibling of the form (never nested), so its
          own <form> stays valid; the new client is selected on the project. */}
      <InlineClientForm
        onCreated={(c) => {
          setClientList((list) => [...list, c]);
          setSelectedClientId(c.id);
        }}
      />
    </div>
  );
}
