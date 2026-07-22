"use client";

import { useRef, useState, useTransition } from "react";
import { Timer } from "@/components/Timer";
import { ConfirmAction } from "@/components/ConfirmAction";
import { createSubtask, deleteTask, setTaskBillable } from "@/app/actions/tasks";

export type TaskNode = {
  id: string;
  name: string;
  isBillable: boolean;
  running: { id: string; started_at: string } | null;
  loggedSeconds: number;
  children: TaskNode[];
};

const INDENT = 1.75; // rem per level

// Subtask creation is V2 (plan §3.4 D1): machinery kept, entry point hidden.
// Existing subtasks still render below their parents.
const SUBTASK_CREATE_ENABLED: boolean = false;

function Row({
  node,
  depth,
  projectId,
}: {
  node: TaskNode;
  depth: number;
  projectId: string;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [billable, setBillable] = useState(node.isBillable);
  const [billablePending, startBillable] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function toggleBillable() {
    const next = !billable;
    setBillable(next);
    startBillable(async () => {
      const res = await setTaskBillable(node.id, projectId, next);
      if (res?.error) setBillable(!next);
    });
  }

  function addSubtask(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createSubtask(projectId, node.id, formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      formRef.current?.reset();
      setAdding(false);
    });
  }

  return (
    <>
      <div
        className="border-b border-line flex items-center justify-between gap-4 py-3 pr-4 hover:bg-paper-2 transition-colors"
        style={{ paddingLeft: `${1 + depth * INDENT}rem` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {depth > 0 && (
            <span className="h-px w-3 -ml-1 bg-line-strong shrink-0" aria-hidden />
          )}
          <span
            className="shrink-0"
            aria-hidden
            style={
              depth === 0
                ? { height: 6, width: 6, background: "var(--color-ink)" }
                : {
                    height: 6,
                    width: 6,
                    borderRadius: 9999,
                    border: "1px solid var(--color-ink-3)",
                  }
            }
          />
          <span className="truncate">{node.name}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleBillable}
            disabled={billablePending}
            title={
              billable
                ? "Billable — new entries bill by default"
                : "Non-billable — new entries won't bill"
            }
            className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-[var(--radius)] border transition-colors"
            style={{
              borderColor: billable
                ? "var(--color-accent)"
                : "var(--color-line-strong)",
              color: billable ? "var(--color-accent)" : "var(--color-ink-3)",
            }}
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: billable
                  ? "var(--color-accent)"
                  : "var(--color-ink-3)",
              }}
            />
            {billable ? "Billable" : "Non-billable"}
          </button>
          <Timer
            taskId={node.id}
            projectId={projectId}
            running={node.running}
            loggedSeconds={node.loggedSeconds}
          />
          {SUBTASK_CREATE_ENABLED && (
            <button
              onClick={() => setAdding((v) => !v)}
              className="btn btn-ghost btn-sm"
              aria-label="Add subtask"
              title="Add a subtask"
            >
              + Subtask
            </button>
          )}
          <ConfirmAction
            action={deleteTask.bind(null, node.id, projectId)}
            label="Delete"
            confirmLabel="Delete task?"
            className="btn btn-ghost btn-sm"
          />
        </div>
      </div>

      {SUBTASK_CREATE_ENABLED && adding && (
        <div
          className="border-b border-line py-2 pr-4"
          style={{ paddingLeft: `${1 + (depth + 1) * INDENT}rem` }}
        >
          <form
            ref={formRef}
            action={addSubtask}
            className="flex items-center gap-2"
          >
            <span className="text-ink-3 shrink-0" aria-hidden>
              ↳
            </span>
            <input
              name="name"
              autoFocus
              required
              placeholder="Subtask…"
              className="field flex-1 py-1.5"
            />
            <button
              type="submit"
              disabled={pending}
              className="btn btn-accent px-3"
            >
              {pending ? "…" : "Add"}
            </button>
            <button
              type="button"
              className="btn px-3"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
            >
              Cancel
            </button>
            {error && <span className="num text-xs text-accent">{error}</span>}
          </form>
        </div>
      )}

      {node.children.map((child) => (
        <Row
          key={child.id}
          node={child}
          depth={depth + 1}
          projectId={projectId}
        />
      ))}
    </>
  );
}

export function TaskTree({
  projectId,
  nodes,
}: {
  projectId: string;
  nodes: TaskNode[];
}) {
  if (nodes.length === 0) return null;
  return (
    <div className="border-t border-x border-line">
      {nodes.map((n) => (
        <Row key={n.id} node={n} depth={0} projectId={projectId} />
      ))}
    </div>
  );
}
