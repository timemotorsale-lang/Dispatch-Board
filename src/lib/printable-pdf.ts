type PdfDocument = { contentType?: string; contentBase64?: string | null };

// Chromium blocks top-level data: navigation. A Blob URL opens the actual PDF viewer.
export function openPrintablePdfDocument(document: PdfDocument, reservedViewer?: Window | null): boolean {
  if (document.contentType !== "application/pdf" || !document.contentBase64) return false;
  let url = "";
  try {
    const binary = atob(document.contentBase64);
    if (!binary.startsWith("%PDF-")) return false;
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const viewer = reservedViewer === undefined ? window.open(url, "_blank") : reservedViewer;
    if (!viewer || viewer.closed) { URL.revokeObjectURL(url); return false; }
    if (reservedViewer) viewer.location.href = url;
    try { viewer.opener = null; } catch { /* The viewer is already open. */ }
    window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
    return true;
  } catch {
    if (url) URL.revokeObjectURL(url);
    return false;
  }
}
