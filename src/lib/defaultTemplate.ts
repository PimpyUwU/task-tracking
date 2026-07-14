import PizZip from "pizzip";

/**
 * A built-in invoice template, assembled as a minimal valid .docx at runtime so
 * a user can generate their first invoice with zero setup — no upload required.
 * Uses the same {{placeholders}} + {{#items}}…{{/items}} loop as uploaded
 * templates, so renderInvoiceDocx() fills it identically.
 */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

// Helpers to keep the WordprocessingML readable.
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const para = (runs: string, opts = "") =>
  `<w:p>${opts}${runs}</w:p>`;
const run = (text: string, rpr = "") => `<w:r>${rpr}<w:t xml:space="preserve">${text}</w:t></w:r>`;
const cell = (text: string, rpr = "", w = "2340") =>
  `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${para(run(text, rpr))}</w:tc>`;

const borders = `<w:tblBorders>
<w:top w:val="single" w:sz="4" w:color="D9D4C8"/>
<w:left w:val="none" w:sz="0" w:color="auto"/>
<w:bottom w:val="single" w:sz="4" w:color="D9D4C8"/>
<w:right w:val="none" w:sz="0" w:color="auto"/>
<w:insideH w:val="single" w:sz="4" w:color="ECE7DA"/>
<w:insideV w:val="none" w:sz="0" w:color="auto"/>
</w:tblBorders>`;

const headerRpr = `<w:rPr><w:b/><w:color w:val="7B7163"/><w:sz w:val="18"/></w:rPr>`;
const bodyRpr = `<w:rPr><w:sz w:val="20"/></w:rPr>`;

const DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}">
<w:body>
${para(run("INVOICE {{invoice_number}}", `<w:rPr><w:b/><w:sz w:val="40"/></w:rPr>`), `<w:pPr><w:spacing w:after="80"/></w:pPr>`)}
${para(run("Issued {{issued_date}}   ·   Due {{due_date}}", `<w:rPr><w:color w:val="7B7163"/><w:sz w:val="20"/></w:rPr>`), `<w:pPr><w:spacing w:after="240"/></w:pPr>`)}
${para(run("BILL TO", headerRpr))}
${para(run("{{client_name}}", `<w:rPr><w:b/><w:sz w:val="24"/></w:rPr>`))}
${para(run("{{client_address}}", bodyRpr))}
${para(run("{{client_email}}", bodyRpr), `<w:pPr><w:spacing w:after="120"/></w:pPr>`)}
${para(run("Project: {{project_name}}", bodyRpr), `<w:pPr><w:spacing w:after="200"/></w:pPr>`)}
<w:tbl>
<w:tblPr><w:tblW w:w="5000" w:type="pct"/>${borders}</w:tblPr>
<w:tblGrid><w:gridCol w:w="4680"/><w:gridCol w:w="1560"/><w:gridCol w:w="1560"/><w:gridCol w:w="1560"/></w:tblGrid>
<w:tr>
${cell("Description", headerRpr, "4680")}
${cell("Hours", headerRpr, "1560")}
${cell("Rate", headerRpr, "1560")}
${cell("Amount", headerRpr, "1560")}
</w:tr>
<w:tr>
<w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>${para(run("{{#items}}{{description}}", bodyRpr))}</w:tc>
${cell("{{hours}}", bodyRpr, "1560")}
${cell("{{rate}}", bodyRpr, "1560")}
<w:tc><w:tcPr><w:tcW w:w="1560" w:type="dxa"/></w:tcPr>${para(run("{{amount}}{{/items}}", bodyRpr))}</w:tc>
</w:tr>
</w:tbl>
${para(run("Billable hours: {{billable_hours}}", `<w:rPr><w:color w:val="7B7163"/><w:sz w:val="20"/></w:rPr>`), `<w:pPr><w:spacing w:before="200" w:after="40"/></w:pPr>`)}
${para(run("Subtotal: {{subtotal}}", bodyRpr))}
${para(run("{{#has_tax}}", bodyRpr))}
${para(run("{{tax_label}} ({{tax_rate}}%): {{tax_amount}}", bodyRpr))}
${para(run("{{/has_tax}}", bodyRpr))}
${para(run("Total: {{total_amount}}", `<w:rPr><w:b/><w:sz w:val="28"/></w:rPr>`), `<w:pPr><w:spacing w:after="200"/></w:pPr>`)}
${para(run("Rates were locked at generation on {{issued_date}}. Editing a rate later does not change this invoice.", `<w:rPr><w:i/><w:color w:val="7B7163"/><w:sz w:val="16"/></w:rPr>`))}
${para(run("{{notes}}", bodyRpr), `<w:pPr><w:spacing w:before="120"/></w:pPr>`)}
</w:body>
</w:document>`;

export function buildDefaultTemplateDocx(): Buffer {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", RELS);
  zip.file("word/document.xml", DOCUMENT);
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}
