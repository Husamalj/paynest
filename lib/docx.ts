// Client-side helpers for the Word (.docx) training-offer templates.
// Heavy libs are imported dynamically so they never load on the server.

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Convert a base64 data URI to an ArrayBuffer.
function dataUriToArrayBuffer(uri: string): ArrayBuffer {
  const base64 = uri.includes(",") ? uri.slice(uri.indexOf(",") + 1) : uri;
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// Read a File as a base64 data URI.
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// Extract distinct {{placeholder}} names found anywhere in the document XML.
export async function extractPlaceholders(dataUri: string): Promise<string[]> {
  const PizZip = (await import("pizzip")).default;
  const zip = new PizZip(dataUriToArrayBuffer(dataUri));
  const names = new Set<string>();
  Object.keys(zip.files).forEach((name) => {
    if (!/word\/.*\.xml$/.test(name)) return;
    const xml = zip.files[name].asText();
    // Strip tags so placeholders split across runs are rejoined, then match.
    const text = xml.replace(/<[^>]+>/g, "");
    const re = /\{\{\s*([^{}]+?)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) names.add(m[1].trim());
  });
  return Array.from(names);
}

// Collect the visible text of a DOM element (all descendant <w:t>).
function nodeText(el: any): string {
  const ts = el.getElementsByTagName("w:t");
  let s = "";
  for (let i = 0; i < ts.length; i++) s += ts[i].textContent || "";
  return s.trim();
}

// Find the nearest ancestor <w:tr> of a node (to skip nested tables).
function nearestRow(node: any): any {
  let n = node.parentNode;
  while (n) { if (n.nodeName === "w:tr") return n; n = n.parentNode; }
  return null;
}

export type AutoMarkResult = { dataUri: string; fields: { key: string; label: string }[] };

// Auto-detect fillable cells in a table-based contract: for every row that has a
// labelled cell + an empty cell, insert a {{fN}} marker into the empty one.
// Returns the modified .docx (data URI) ready for templating, plus the field map.
export async function autoMarkTemplate(dataUri: string): Promise<AutoMarkResult> {
  const PizZip = (await import("pizzip")).default;
  const { DOMParser, XMLSerializer } = await import("@xmldom/xmldom");
  const zip = new PizZip(dataUriToArrayBuffer(dataUri));

  const fields: { key: string; label: string }[] = [];
  let counter = 0;
  const DOCX_MIME_LOCAL = DOCX_MIME;

  for (const fname of Object.keys(zip.files)) {
    if (!/word\/(document|header\d*|footer\d*)\.xml$/.test(fname)) continue;
    const xml = zip.files[fname].asText();
    if (!xml.includes("<w:tbl")) continue; // no tables here
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const rows = doc.getElementsByTagName("w:tr");

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Direct cells only (cells whose nearest row is this row).
      const allCells = row.getElementsByTagName("w:tc");
      const cells: any[] = [];
      for (let c = 0; c < allCells.length; c++) if (nearestRow(allCells[c]) === row) cells.push(allCells[c]);
      if (cells.length !== 2) continue;

      const t0 = nodeText(cells[0]);
      const t1 = nodeText(cells[1]);
      let labelCell: any, emptyCell: any, label: string;
      if (t0 && !t1) { labelCell = cells[0]; emptyCell = cells[1]; label = t0; }
      else if (t1 && !t0) { labelCell = cells[1]; emptyCell = cells[0]; label = t1; }
      else continue; // both empty or both filled → leave as-is
      void labelCell;

      const key = "f" + (++counter);
      fields.push({ key, label: label.replace(/[:：]\s*$/, "") });

      // Insert a run "{{key}}" into the empty cell's first paragraph.
      let p = (() => {
        const ps = emptyCell.getElementsByTagName("w:p");
        for (let k = 0; k < ps.length; k++) if (nearestCellOf(ps[k]) === emptyCell) return ps[k];
        return null;
      })();
      if (!p) { p = doc.createElement("w:p"); emptyCell.appendChild(p); }
      const r = doc.createElement("w:r");
      const t = doc.createElement("w:t");
      t.setAttribute("xml:space", "preserve");
      t.appendChild(doc.createTextNode(`{{${key}}}`));
      r.appendChild(t);
      p.appendChild(r);
    }

    zip.file(fname, new XMLSerializer().serializeToString(doc));
  }

  const blob = zip.generate({ type: "base64", mimeType: DOCX_MIME_LOCAL });
  return { dataUri: `data:${DOCX_MIME_LOCAL};base64,${blob}`, fields };
}

// Nearest ancestor <w:tc> of a node.
function nearestCellOf(node: any): any {
  let n = node.parentNode;
  while (n) { if (n.nodeName === "w:tc") return n; n = n.parentNode; }
  return null;
}

// Render the template with values → filled .docx Blob.
export async function renderDocx(
  dataUri: string,
  values: Record<string, string>
): Promise<Blob> {
  const PizZip = (await import("pizzip")).default;
  const Docxtemplater = (await import("docxtemplater")).default;
  const zip = new PizZip(dataUriToArrayBuffer(dataUri));
  const doc = new Docxtemplater(zip, {
    delimiters: { start: "{{", end: "}}" },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "", // empty for any unfilled placeholder
  });
  doc.render(values);
  return doc.getZip().generate({ type: "blob", mimeType: DOCX_MIME });
}

// Trigger a browser download for a Blob.
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Render a filled .docx Blob into a container element (for on-screen preview / print).
export async function renderDocxToElement(blob: Blob, container: HTMLElement) {
  const { renderAsync } = await import("docx-preview");
  container.innerHTML = "";
  await renderAsync(blob, container, undefined, {
    className: "docx",
    inWrapper: false,
    ignoreWidth: false,
    ignoreHeight: false,
  });
}
