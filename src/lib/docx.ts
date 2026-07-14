import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

/**
 * DOCX templating via docxtemplater (pure JS — runs fine on serverless).
 * Delimiters are set to {{ }} to match the invoice template placeholders
 * (e.g. {{client_name}}, {{total_amount}}) and loop tags {{#items}}…{{/items}}.
 */

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const DELIMITERS = { start: "{{", end: "}}" } as const;

/** Fill a template .docx buffer with `data`, returning the rendered .docx buffer. */
export function renderInvoiceDocx(
  templateBuffer: Buffer,
  data: Record<string, unknown>,
): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    delimiters: DELIMITERS,
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render(data);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * Best-effort extraction of {{placeholder}} names from an uploaded template,
 * for display only (schema column is nullable). XML tags are stripped first so
 * placeholders split across runs are still detected.
 */
export function detectPlaceholders(templateBuffer: Buffer): string[] {
  const zip = new PizZip(templateBuffer);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  const text = xml.replace(/<[^>]+>/g, "");
  const found = new Set<string>();
  const re = /\{\{\s*[#/^]?\s*([\w.]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) found.add(m[1]);
  return [...found];
}
