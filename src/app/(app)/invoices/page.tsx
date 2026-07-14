import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TemplateUploadForm } from "@/components/TemplateUploadForm";
import { InvoiceGenerateForm } from "@/components/InvoiceGenerateForm";
import { ConfirmAction } from "@/components/ConfirmAction";
import { setDefaultTemplate, deleteTemplate } from "@/app/actions/invoiceTemplates";
import { formatMoney } from "@/lib/invoice";

const STATUS_TONE: Record<string, string> = {
  draft: "text-ink-3",
  sent: "text-ink",
  paid: "text-gold font-semibold",
  void: "text-ink-3 line-through",
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  currency: string;
  total: number;
  issued_date: string | null;
  pdf_path: string | null;
  docx_path: string | null;
  clients: { name: string } | null;
};

export default async function InvoicesPage() {
  const supabase = await createClient();

  const [{ data: templates }, { data: invoices }, { data: clients }, { data: projects }] =
    await Promise.all([
      supabase.from("invoice_templates").select("*").order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, invoice_number, status, currency, total, issued_date, pdf_path, docx_path, clients(name)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name").eq("is_archived", false).order("name", { ascending: true }),
      supabase.from("projects").select("id, name, client_id").eq("is_archived", false).order("name", { ascending: true }),
    ]);

  const templateList = templates ?? [];
  const invoiceList = (invoices ?? []) as unknown as InvoiceRow[];
  const empty = invoiceList.length === 0;
  const templateOptions = templateList.map((t) => ({ id: t.id, name: t.name, is_default: t.is_default }));

  return (
    <div className="max-w-5xl px-5 md:px-8 py-7 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-ink-2 mt-1">
          Pull billable, un-invoiced time into a document — no setup required.
        </p>
      </div>

      {/* Create — the primary action */}
      <section className="flex flex-col gap-3">
        {empty ? (
          <div className="panel px-6 py-10 text-center flex flex-col items-center gap-4"
            style={{ borderColor: "var(--gold-line)" }}
          >
            <div className="h-11 w-11 rounded-[10px] grid place-items-center num text-lg"
              style={{ background: "var(--gold-dim)", border: "1px solid var(--gold-line)", color: "var(--gold)" }}
            >§</div>
            <div>
              <h2 className="text-lg font-semibold">Generate your first invoice</h2>
              <p className="text-sm text-ink-2 mt-1 max-w-md mx-auto">
                Uses a built-in template — no upload needed. Pick a client and FluxWork
                turns their billable, un-invoiced time into a downloadable invoice.
              </p>
            </div>
            <InvoiceGenerateForm
              clients={clients ?? []}
              projects={projects ?? []}
              templates={templateOptions}
            />
          </div>
        ) : (
          <>
            <h2 className="panel-title">Create invoice</h2>
            <InvoiceGenerateForm
              clients={clients ?? []}
              projects={projects ?? []}
              templates={templateOptions}
            />
          </>
        )}
      </section>

      {/* Invoice list */}
      {!empty && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="panel-title">All invoices</h2>
            <span className="num text-xs text-ink-3">{invoiceList.length}</span>
          </div>
          <div className="panel overflow-x-auto">
            <table className="w-full border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-surface-2">
                  <th className="text-left label font-semibold px-4 py-3 rule-b">Number</th>
                  <th className="text-left label font-semibold px-4 py-3 rule-b">Client</th>
                  <th className="text-left label font-semibold px-4 py-3 rule-b">Status</th>
                  <th className="text-right label font-semibold px-4 py-3 rule-b">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceList.map((inv) => (
                  <tr key={inv.id} className="rule-b last:border-b-0 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3.5">
                      <Link href={`/invoices/${inv.id}`} className="num text-sm flex items-center gap-2 hover:text-gold transition-colors">
                        {inv.invoice_number}
                        {inv.pdf_path && <span className="badge badge-bill" style={{ fontSize: "0.6rem" }}>PDF</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-2 truncate">{inv.clients?.name ?? "—"}</td>
                    <td className={`px-4 py-3.5 text-sm ${STATUS_TONE[inv.status] ?? ""}`}>{inv.status}</td>
                    <td className="px-4 py-3.5 text-right num text-sm">{formatMoney(inv.total, inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Templates — optional power path */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="panel-title">Custom templates</h2>
            <span className="badge badge-non"><span className="dot" />optional</span>
          </div>
          <TemplateUploadForm />
        </div>
        <p className="text-sm text-ink-2 -mt-1">
          FluxWork uses a clean built-in template by default. Upload your own branded
          .docx to override it — with placeholders like{" "}
          <code className="num text-ink-3">{"{{client_name}}"}</code> and a{" "}
          <code className="num text-ink-3">{"{{#items}}"}</code> loop.
        </p>

        {templateList.length > 0 && (
          <div className="panel overflow-hidden">
            {templateList.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rule-b last:border-b-0">
                <div className="min-w-0">
                  <p className="font-medium truncate flex items-center gap-2">
                    {t.name}
                    {t.is_default && <span className="badge badge-bill"><span className="dot" />default</span>}
                  </p>
                  <p className="text-xs text-ink-3 truncate">
                    {Array.isArray(t.placeholders) && t.placeholders.length > 0
                      ? (t.placeholders as string[]).join(", ")
                      : t.original_filename}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!t.is_default && (
                    <form action={async () => { "use server"; await setDefaultTemplate(t.id); }}>
                      <button type="submit" className="btn btn-ghost btn-sm">Set default</button>
                    </form>
                  )}
                  <ConfirmAction action={deleteTemplate.bind(null, t.id)} label="Delete" confirmLabel="Delete?" className="btn btn-ghost btn-sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
