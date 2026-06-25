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
