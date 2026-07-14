"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadTemplate } from "@/app/actions/invoiceTemplates";

export function TemplateUploadForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await uploadTemplate(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + Upload template
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={onSubmit}
      className="rise border border-line-strong bg-paper-2 p-5 flex flex-col gap-4 rounded-md"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label block mb-2">Template name</label>
          <input
            name="name"
            className="field"
            placeholder="Standard invoice"
            autoFocus
          />
        </div>
        <div>
          <label className="label block mb-2">Word file (.docx)</label>
          <input
            name="file"
            type="file"
            accept=".docx"
            required
            className="field py-2"
          />
        </div>
      </div>

      <p className="text-xs text-ink-3">
        Use placeholders like{" "}
        <code className="num">{"{{client_name}}"}</code>,{" "}
        <code className="num">{"{{total_amount}}"}</code>, and a line-item loop{" "}
        <code className="num">{"{{#items}}…{{/items}}"}</code> with{" "}
        <code className="num">{"{{description}}"}</code>,{" "}
        <code className="num">{"{{hours}}"}</code>,{" "}
        <code className="num">{"{{rate}}"}</code>,{" "}
        <code className="num">{"{{amount}}"}</code>.
      </p>

      {error && <p className="num text-xs text-accent">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-accent">
          {pending ? "Uploading…" : "Upload"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
