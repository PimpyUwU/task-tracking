"use client";

import { useRef, useState, useTransition } from "react";
import { createTask } from "@/app/actions/tasks";

export function TaskForm({ projectId }: { projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createTask(projectId, formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          name="name"
          required
          className="field flex-1"
          placeholder="Add a task…"
        />
        <button type="submit" disabled={pending} className="btn btn-accent">
          {pending ? "Adding…" : "Add task"}
        </button>
      </div>
      {error && <p className="num text-xs text-accent">{error}</p>}
    </form>
  );
}
