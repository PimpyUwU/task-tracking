"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  buildInvoiceDraft,
  formatMoney,
  type DraftParams,
  type InvoiceDraft,
} from "@/lib/invoice";
import { renderInvoiceDocx, DOCX_MIME } from "@/lib/docx";
import { renderInvoicePdf } from "@/lib/invoicePdf";
import { buildDefaultTemplateDocx } from "@/lib/defaultTemplate";
import { track } from "@/lib/analytics";
import { assertCanInvoice } from "@/lib/plan";

const INVOICE_BUCKET = "invoices";
const TEMPLATE_BUCKET = "invoice-templates";
const PDF_MIME = "application/pdf";
const STATUSES = ["draft", "sent", "paid", "void"] as const;

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const today = () => new Date().toISOString().slice(0, 10);

/** Dry run for the UI: what would be invoiced, without persisting anything. */
export async function previewInvoice(params: DraftParams) {
  const { supabase } = await requireUser();
  const res = await buildInvoiceDraft(supabase, params);
  if ("error" in res) return { error: res.error };
  const { draft } = res;
  return {
    ok: true as const,
    lines: draft.lines,
    subtotal: draft.subtotal,
    tax: draft.tax,
    total: draft.total,
    currency: draft.currency,
    billableHours: draft.billableHours,
    entryCount: draft.entryIds.length,
  };
}

/** Build the flat data object handed to the docx template. */
function templateData(
  draft: InvoiceDraft,
  meta: {
    invoiceNumber: string;
    issuedDate: string;
    dueDate: string | null;
    projectName: string;
    notes: string | null;
  },
) {
  return {
    invoice_number: meta.invoiceNumber,
    issued_date: meta.issuedDate,
    due_date: meta.dueDate ?? "",
    currency: draft.currency,
    client_name: draft.client.name,
    client_email: draft.client.email ?? "",
    client_address: draft.client.address ?? "",
    project_name: meta.projectName,
    billable_hours: draft.billableHours.toFixed(2),
    subtotal: formatMoney(draft.subtotal, draft.currency),
    // Tax is a single optional line. `has_tax` drives the {{#has_tax}}…{{/has_tax}}
    // conditional section in templates so zero-tax invoices hide the row entirely.
    has_tax: draft.tax.amount > 0,
    tax_label:
      (draft.tax.label && draft.tax.label.trim()) || "Tax",
    tax_rate: draft.tax.rate.toFixed(draft.tax.rate % 1 === 0 ? 0 : 2),
    tax_amount: formatMoney(draft.tax.amount, draft.currency),
    total: formatMoney(draft.total, draft.currency),
    total_amount: formatMoney(draft.total, draft.currency),
    notes: meta.notes ?? "",
    items: draft.lines.map((l, i) => ({
      n: i + 1,
      description: l.description,
      hours: l.hours.toFixed(2),
      rate: formatMoney(l.rate, draft.currency),
      amount: formatMoney(l.amount, draft.currency),
    })),
  };
}

export async function generateInvoice(formData: FormData) {
  const { supabase, user } = await requireUser();

  // Invoicing is a paid-only feature.
  const planErr = await assertCanInvoice(supabase);
  if (planErr) return planErr;

  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!clientId) return { error: "Select a client." };

  const projectId = String(formData.get("project_id") ?? "").trim() || null;
  const templateIdInput = String(formData.get("template_id") ?? "").trim() || null;
  const periodStart = String(formData.get("period_start") ?? "").trim() || null;
  const periodEnd = String(formData.get("period_end") ?? "").trim() || null;
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const numberInput = String(formData.get("invoice_number") ?? "").trim() || null;

  const res = await buildInvoiceDraft(supabase, {
    clientId,
    projectId,
    periodStart,
    periodEnd,
  });
  if ("error" in res) return { error: res.error };
  const { draft } = res;

  // Auto invoice number when not supplied: INV-0001, 0002, …
  let invoiceNumber = numberInput;
  if (!invoiceNumber) {
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;
  }

  const issuedDate = today();

  // Resolve template: explicit choice, else the user's default (may be none).
  let template: { storage_path: string } | null = null;
  let templateId: string | null = templateIdInput;
  if (templateIdInput) {
    const { data } = await supabase
      .from("invoice_templates")
      .select("id, storage_path")
      .eq("id", templateIdInput)
      .maybeSingle();
    template = data ?? null;
  } else {
    const { data } = await supabase
      .from("invoice_templates")
      .select("id, storage_path")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle();
    if (data) {
      template = data;
      templateId = data.id;
    }
  }

  // Persist the invoice header.
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      client_id: clientId,
      project_id: projectId,
      template_id: templateId,
      invoice_number: invoiceNumber,
      status: "draft",
      currency: draft.currency,
      period_start: periodStart,
      period_end: periodEnd,
      issued_date: issuedDate,
      due_date: dueDate,
      subtotal: draft.subtotal,
      tax_label: draft.tax.label,
      tax_rate: draft.tax.rate,
      tax_amount: draft.tax.amount,
      total: draft.total,
      notes,
    })
    .select("id")
    .single();

  if (invErr) {
    if (invErr.code === "23505") {
      return { error: `Invoice number "${invoiceNumber}" already exists.` };
    }
    return { error: invErr.message };
  }
  const invoiceId = invoice.id;

  // Snapshot the line items.
  const { error: lineErr } = await supabase.from("invoice_line_items").insert(
    draft.lines.map((l, i) => ({
      invoice_id: invoiceId,
      user_id: user.id,
      task_id: l.taskId,
      description: l.description,
      hours: l.hours,
      rate: l.rate,
      amount: l.amount,
      sort_order: i,
    })),
  );
  if (lineErr) {
    await supabase.from("invoices").delete().eq("id", invoiceId);
    return { error: lineErr.message };
  }

  // Claim the time entries so they can't be billed twice (only still-free ones).
  await supabase
    .from("time_entries")
    .update({ invoice_id: invoiceId })
    .in("id", draft.entryIds)
    .is("invoice_id", null);

  // Funnel: invoice_generated (fires once the invoice + line items are committed,
  // independent of whether document rendering below succeeds).
  await track(supabase, "invoice_generated", {
    invoice_id: invoiceId,
    total: draft.total,
    currency: draft.currency,
  });

  // Always render a document. Use the chosen/default uploaded template if any,
  // otherwise the built-in default so first-time users need zero setup.
  let warning: string | undefined;
  try {
    let projectName = "";
    if (projectId) {
      const { data: proj } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .maybeSingle();
      projectName = proj?.name ?? "";
    }

    let tmplBuf: Buffer;
    if (template) {
      const { data: tmplBlob, error: dlErr } = await supabase.storage
        .from(TEMPLATE_BUCKET)
        .download(template.storage_path);
      if (dlErr || !tmplBlob) throw new Error(dlErr?.message ?? "template missing");
      tmplBuf = Buffer.from(await tmplBlob.arrayBuffer());
    } else {
      tmplBuf = buildDefaultTemplateDocx();
    }

    const data = templateData(draft, {
      invoiceNumber,
      issuedDate,
      dueDate,
      projectName,
      notes,
    });
    const docxBuf = renderInvoiceDocx(tmplBuf, data);

    const docxPath = `${user.id}/${invoiceId}.docx`;
    const { error: docxUpErr } = await supabase.storage
      .from(INVOICE_BUCKET)
      .upload(docxPath, docxBuf, { contentType: DOCX_MIME, upsert: true });
    if (docxUpErr) throw new Error(docxUpErr.message);

    // Native PDF (send-to-client format), rendered in-process from the draft
    // data — no external service. Best-effort: a PDF failure must not cost the
    // user their DOCX, which is already uploaded above.
    let pdfPath: string | null = null;
    try {
      const pdfBuf = await renderInvoicePdf(draft, {
        invoiceNumber,
        issuedDate,
        dueDate,
        projectName,
        notes,
      });
      const candidate = `${user.id}/${invoiceId}.pdf`;
      const { error: pdfUpErr } = await supabase.storage
        .from(INVOICE_BUCKET)
        .upload(candidate, pdfBuf, { contentType: PDF_MIME, upsert: true });
      if (!pdfUpErr) pdfPath = candidate;
    } catch {
      pdfPath = null;
    }

    await supabase
      .from("invoices")
      .update({ docx_path: docxPath, pdf_path: pdfPath })
      .eq("id", invoiceId);
  } catch (e) {
    // Keep the invoice record even if document rendering fails; surface why.
    warning =
      "Invoice saved, but document generation failed: " +
      (e instanceof Error ? e.message : "unknown error") +
      (template ? ". Check that your template's placeholders match." : ".");
  }

  revalidatePath("/invoices");
  return { ok: true as const, id: invoiceId, warning };
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const { supabase } = await requireUser();
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { error: "Invalid status." };
  }
  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId);
  if (error) return { error: error.message };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

/** Signed, time-limited download URL for a generated file ("docx" | "pdf"). */
export async function getInvoiceFileUrl(
  invoiceId: string,
  kind: "docx" | "pdf",
) {
  const { supabase } = await requireUser();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("docx_path, pdf_path")
    .eq("id", invoiceId)
    .maybeSingle();
  const path = kind === "pdf" ? invoice?.pdf_path : invoice?.docx_path;
  if (!path) return { error: "That file isn't available for this invoice." };

  const { data, error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error) return { error: error.message };
  return { ok: true as const, url: data.signedUrl };
}

export async function deleteInvoice(invoiceId: string) {
  const { supabase } = await requireUser();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("docx_path, pdf_path")
    .eq("id", invoiceId)
    .maybeSingle();

  // ON DELETE SET NULL frees the stamped time_entries; line items cascade.
  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) return { error: error.message };

  const paths = [invoice?.docx_path, invoice?.pdf_path].filter(
    (p): p is string => Boolean(p),
  );
  if (paths.length) await supabase.storage.from(INVOICE_BUCKET).remove(paths);

  revalidatePath("/invoices");
  redirect("/invoices");
}
