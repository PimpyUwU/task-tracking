"use client";

import { useRef, useState, useTransition } from "react";
import { addManualEntry } from "@/app/actions/time";

type TaskOption = { id: string; name: string };

export function ManualEntryForm({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: TaskOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addManualEntry(projectId, formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (tasks.length === 0) return null;

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + Log time manually
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
        <div className="sm:col-span-2">
          <label className="label block mb-2">Task</label>
          <select name="task_id" required className="field" defaultValue="">
            <option value="" disabled>
              Select a task…
            </option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label block mb-2">Start</label>
          <input name="started_at" type="datetime-local" required className="field" />
        </div>
        <div>
          <label className="label block mb-2">End</label>
          <input name="ended_at" type="datetime-local" required className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label block mb-2">Notes</label>
          <input name="notes" className="field" placeholder="Optional" />
        </div>
      </div>

      {error && <p className="num text-xs text-accent">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-accent">
          {pending ? "Saving…" : "Log entry"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
