"use client";

import { useRef, useState, useTransition } from "react";
import { createProject } from "@/app/actions/projects";

const SWATCHES = ["#ff3b00", "#111012", "#1f6feb", "#1a7f5a", "#9a6dff", "#d4a017"];

type ClientOption = { id: string; name: string };

export function ProjectForm({
  clients = [],
  variant = "primary",
}: {
  clients?: ClientOption[];
  /** "ghost" demotes the trigger where the timer is the primary action. */
  variant?: "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(SWATCHES[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

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
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        className={variant === "ghost" ? "btn btn-ghost" : "btn btn-accent"}
        onClick={() => setOpen(true)}
      >
        + New project
      </button>
    );
  }

  return (
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
          {clients.length === 0 ? (
            <input
              className="field"
              placeholder="Add clients first"
              disabled
            />
          ) : (
            <select name="client_id" className="field" defaultValue="">
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
  );
}
