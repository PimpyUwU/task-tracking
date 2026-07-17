import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";
import { formatMoney, type InvoiceDraft } from "@/lib/invoice";

/**
 * Native invoice PDF generation — renders directly from the invoice draft data
 * using @react-pdf/renderer (pure JS, runs in the Node server action; Next 16
 * auto-externalizes the package). This replaces the previous DOCX→PDF round-trip
 * through the n8n/Gotenberg webhook: no external service, no network dependency.
 *
 * The DOCX path (docx.ts / defaultTemplate.ts) is unchanged and still produces
 * the editable format. This module owns the send-to-client PDF.
 *
 * Fonts: if the brand TTFs are present under src/assets/fonts they are embedded;
 * otherwise we fall back to the PDF standard 14 faces. Colours (below) already
 * carry the FluxWork identity either way.
 */

// ── Brand palette (mirrors globals.css, tuned for white invoice paper) ──────
const C = {
  ink: "#0f1a1c",
  muted: "#566468",
  faint: "#7e8a8d",
  line: "#dce2e1",
  lineStrong: "#c7d0cf",
  teal: "#0e5c63",
  green: "#176048", // billable / money
  tealTint: "#eef4f4",
} as const;

// ── Fonts: embed brand TTFs when available, else standard faces ─────────────
const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");

function registerIfPresent(
  family: string,
  fonts: { file: string; fontWeight?: number; fontStyle?: "italic" }[],
  fallback: string,
): string {
  try {
    const resolved = fonts.map((f) => ({
      src: path.join(FONT_DIR, f.file),
      fontWeight: f.fontWeight,
      fontStyle: f.fontStyle,
    }));
    if (!resolved.every((f) => fs.existsSync(f.src))) return fallback;
    Font.register({ family, fonts: resolved });
    return family;
  } catch {
    return fallback;
  }
}

const SERIF = registerIfPresent(
  "InstrumentSerif",
  [{ file: "InstrumentSerif-Regular.ttf" }],
  "Times-Roman",
);
const SANS = registerIfPresent(
  "HankenGrotesk",
  [
    { file: "HankenGrotesk-Regular.ttf" },
    { file: "HankenGrotesk-SemiBold.ttf", fontWeight: 600 },
  ],
  "Helvetica",
);
const MONO = registerIfPresent(
  "IBMPlexMono",
  [{ file: "IBMPlexMono-Regular.ttf" }],
  "Courier",
);

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: SANS,
    fontSize: 10,
    color: C.ink,
    lineHeight: 1.4,
  },
  title: { fontFamily: SERIF, fontSize: 30, color: C.teal },
  subtle: { color: C.muted, fontSize: 10, marginTop: 2 },
  label: {
    fontFamily: MONO,
    fontSize: 7.5,
    letterSpacing: 1,
    color: C.faint,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  clientName: { fontFamily: SANS, fontWeight: 600, fontSize: 13 },
  billToBlock: { marginTop: 22 },
  projectLine: { marginTop: 10, color: C.muted },

  // Line-items table
  table: { marginTop: 22 },
  thead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.lineStrong,
    paddingBottom: 5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 6,
  },
  th: { fontFamily: MONO, fontSize: 7.5, letterSpacing: 0.5, color: C.faint, textTransform: "uppercase" },
  colDesc: { flex: 1, paddingRight: 8 },
  colNum: { width: 70, textAlign: "right" },
  colMoney: { width: 90, textAlign: "right" },
  num: { fontFamily: MONO, fontSize: 9.5 },

  // Totals
  totals: { marginTop: 18, marginLeft: "auto", width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { color: C.muted },
  totalValue: { fontFamily: MONO, fontSize: 9.5 },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.lineStrong,
  },
  grandLabel: { fontFamily: SANS, fontWeight: 600, fontSize: 12 },
  grandValue: { fontFamily: MONO, fontSize: 14, color: C.green },

  footNote: { marginTop: 28, fontStyle: "italic", color: C.faint, fontSize: 8.5 },
  notes: { marginTop: 12, color: C.muted },
});

export type InvoicePdfMeta = {
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string | null;
  projectName: string;
  notes: string | null;
};

function InvoiceDocument({ draft, meta }: { draft: InvoiceDraft; meta: InvoicePdfMeta }) {
  const cur = draft.currency;
  const hasTax = draft.tax.amount > 0;
  const taxLabel = (draft.tax.label && draft.tax.label.trim()) || "Tax";
  const taxRate = draft.tax.rate.toFixed(draft.tax.rate % 1 === 0 ? 0 : 2);

  return (
    <Document
      title={`Invoice ${meta.invoiceNumber}`}
      author="FluxWork"
      creator="FluxWork"
      producer="FluxWork"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.title}>INVOICE {meta.invoiceNumber}</Text>
        <Text style={styles.subtle}>
          Issued {meta.issuedDate}
          {meta.dueDate ? `   ·   Due ${meta.dueDate}` : ""}
        </Text>

        {/* Bill to */}
        <View style={styles.billToBlock}>
          <Text style={styles.label}>Bill to</Text>
          <Text style={styles.clientName}>{draft.client.name}</Text>
          {draft.client.address ? <Text>{draft.client.address}</Text> : null}
          {draft.client.email ? <Text style={styles.subtle}>{draft.client.email}</Text> : null}
        </View>

        {meta.projectName ? (
          <Text style={styles.projectLine}>Project: {meta.projectName}</Text>
        ) : null}

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colNum]}>Hours</Text>
            <Text style={[styles.th, styles.colNum]}>Rate</Text>
            <Text style={[styles.th, styles.colMoney]}>Amount</Text>
          </View>
          {draft.lines.map((l, i) => (
            <View style={styles.row} key={i} wrap={false}>
              <Text style={styles.colDesc}>{l.description}</Text>
              <Text style={[styles.num, styles.colNum]}>{l.hours.toFixed(2)}</Text>
              <Text style={[styles.num, styles.colNum]}>{formatMoney(l.rate, cur)}</Text>
              <Text style={[styles.num, styles.colMoney]}>{formatMoney(l.amount, cur)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Billable hours</Text>
            <Text style={styles.totalValue}>{draft.billableHours.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatMoney(draft.subtotal, cur)}</Text>
          </View>
          {hasTax ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {taxLabel} ({taxRate}%)
              </Text>
              <Text style={styles.totalValue}>{formatMoney(draft.tax.amount, cur)}</Text>
            </View>
          ) : null}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{formatMoney(draft.total, cur)}</Text>
          </View>
        </View>

        {/* Rate-lock note + notes */}
        <Text style={styles.footNote}>
          Rates were locked at generation on {meta.issuedDate}. Editing a rate later does not
          change this invoice.
        </Text>
        {meta.notes ? <Text style={styles.notes}>{meta.notes}</Text> : null}
      </Page>
    </Document>
  );
}

/** Render an invoice PDF to a Buffer, natively in-process (no external service). */
export async function renderInvoicePdf(
  draft: InvoiceDraft,
  meta: InvoicePdfMeta,
): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument draft={draft} meta={meta} />);
}
