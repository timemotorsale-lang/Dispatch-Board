"use client";

// Deliberately independent of global app CSS, navigation, dialogs and web fonts.
export const SERVICE_DOCUMENT_PRINT_CSS = `
@page { size: letter; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; background: white; color: #172334; font: 11px/1.5 Arial, sans-serif; }
article { width: 100%; max-width: 900px; margin: 24px auto; padding: 20px; }
header { display: flex; align-items: center; justify-content: space-between; gap: 20px; border-top: 4px solid #244f87; border-bottom: 1px solid #cad6e5; padding: 16px 0; break-inside: avoid; }
h1 { margin: 0; font-size: 25px; line-height: 1.2; color: #142e4d; } h2 { font-size: 13px; break-after: avoid; }
header > div { min-width: 0; text-align: right; font-size: 10px; overflow-wrap: anywhere; }
header span, header strong { display: block; } header span { color: #526477; }
header > [data-document-title] { text-align: left; }
[data-document-title] small { display: block; margin-top: 3px; font-size: 9px; color: #526477; }
[data-estimate-summary] { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: end; break-inside: avoid; }
[data-estimate-summary] > dl { grid-area: 1 / 2; width: 100%; }
[data-estimate-summary] > [data-document-signature] { grid-area: 1 / 1; }
[data-document-parties] { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 24px; padding: 8px 0; break-inside: avoid; }
[data-document-brand] { min-width: 0; font-size: 10px; color: #526477; }
[data-document-brand] img { display: block; width: 240px; max-width: 100%; height: auto; margin-bottom: 12px; }
[data-document-brand] a { color: #244f87; display: inline-block; margin: 4px 12px 0 0; overflow-wrap: anywhere; }
[data-document-brand] > p:first-of-type { font-weight: bold; letter-spacing: 1.5px; color: #3b608b; }
[data-document-customer] { min-width: 0; padding-left: 24px; border-left: 1px solid #cad6e5; overflow-wrap: anywhere; }
[data-document-customer] > p { font-size: 18px; font-weight: bold; margin: 8px 0 10px; }
[data-document-customer] h2, [data-print-vehicle] h2, [data-document-concern] h2 { font-size: 9px; letter-spacing: 1.2px; color: #3b608b; margin: 0 0 6px; }
section { margin: 14px 0; } section p { margin: 4px 0; }
[data-print-vehicle] { display: flex; flex-wrap: wrap; gap: 10px 14px; padding: 12px; border: 1px solid #e0e7ef; background: #f1f5fa; font-size: 10px; }
[data-print-vehicle] > div { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
[data-print-vehicle] > div + div { border-left: 1px solid #cad6e5; padding-left: 12px; }
[data-print-vehicle] span { font-size: 9px; color: #526477; }
[data-print-vehicle] strong { font-size: 12px; }
[data-document-concern] { border: 1px solid #cad6e5; padding: 12px; }
[data-document-concern] p { white-space: pre-wrap; overflow-wrap: anywhere; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 18px 0; }
caption { text-align: left; font-weight: bold; margin-bottom: 8px; }
th, td { padding: 8px 5px; border-bottom: 1px solid #cbd5e1; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
th:first-child { width: 55%; } th:not(:first-child),td:not(:first-child) { text-align: right; }
thead { display: table-header-group; } tr { break-inside: avoid; }
td small { display: block; color: #526477; font-size: 10px; margin-top: 3px; }
[aria-label="Other charges"] > div { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; border-bottom: 1px solid #e0e7ef; break-inside: avoid; }
dl { display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; max-width: 320px; margin-left: auto; padding: 12px 0; break-inside: avoid; }
dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
article > dl dt:last-of-type, article > dl dd:last-of-type { font-weight: bold; font-size: 15px; border-top: 1px solid #cbd5e1; margin-top: 5px; padding-top: 8px; }
[aria-label="Payment details"] dl { max-width: none; }
[data-document-signature] { display: grid; grid-template-columns: minmax(0, 1fr) minmax(64px, 26%); gap: 16px; padding-top: 24px; break-inside: avoid; }
[data-document-signature] > span { display: block; border-top: 1px solid #172334; padding-top: 6px; }
footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; border-top: 1px solid #cbd5e1; margin-top: 24px; padding-top: 10px; font-size: 9px; color: #526477; break-inside: avoid; }
.print-controls { padding: 12px; background: #f1f5fa; font-size: 13px; } .print-controls button { padding: 8px 20px; cursor: pointer; } .print-controls span { margin-left: 12px; }
@media print {
  article { max-width: none; margin: 0; padding: 0; }
  header { padding: 10px 0; }
  [data-document-parties] { padding: 4px 0; }
  [data-document-brand] img { width: 205px; margin-bottom: 6px; }
  [data-document-brand] p, [data-document-customer] p { margin: 4px 0; }
  section { margin: 8px 0; }
  [data-print-vehicle], [data-document-concern] { padding: 8px; }
  table { margin: 10px 0; }
  th, td { padding: 5px; }
  [aria-label="Other charges"] > div { padding: 4px 0; }
  dl { gap: 4px 16px; padding: 6px 0; }
  [data-document-signature] { padding-top: 18px; }
  footer { margin-top: 12px; padding-top: 6px; }
  .print-controls { display: none; }
  a { color: inherit; text-decoration: none; }
}
`;

export async function openServiceDocumentPrint(source: HTMLElement | null, autoPrint = true) {
  if (!source) throw new Error("The document is still loading. Try Print again.");
  document.querySelector("[data-service-print-frame]")?.remove();
  const frame = document.createElement("iframe");
  frame.title = "Print copy";
  frame.setAttribute("data-service-print-frame", "true");
  frame.setAttribute("aria-hidden", autoPrint ? "true" : "false");
  frame.style.cssText = autoPrint ? "position:fixed;left:-10000px;top:0;width:816px;height:1056px;border:0;" : "display:block;width:100%;height:1056px;border:1px solid #cad6e5;";
  document.body.append(frame);
  const popup = frame.contentWindow;
  if (!popup) { frame.remove(); throw new Error("Print could not open. Use Save PDF or try again."); }
  const doc = popup.document;
  doc.title = source.querySelector("h1")?.textContent ?? "Service document";
  doc.documentElement.lang = "en";
  const style = doc.createElement("style"); style.textContent = SERVICE_DOCUMENT_PRINT_CSS; doc.head.append(style);
  const copy = source.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("button, nav, script, iframe, [data-print-controls]").forEach(element => element.remove());
  const originals = source.querySelectorAll("img");
  copy.querySelectorAll("img").forEach((img, index) => { img.src = originals[index]?.currentSrc || originals[index]?.src || img.src; img.removeAttribute("srcset"); img.loading = "eager"; });
  const controls = doc.createElement("div"); controls.className = "print-controls";
  const button = doc.createElement("button"); button.textContent = "Print";
  button.addEventListener("click", () => popup.print());
  const status = doc.createElement("span"); status.textContent = "Preparing your document…"; status.setAttribute("role", "status");
  controls.append(button, status); doc.body.replaceChildren(controls, copy);
  try {
    await Promise.all(Array.from(copy.querySelectorAll("img")).map(img => {
      img.loading = "eager";
      if (img.complete) return img.naturalWidth > 0 ? Promise.resolve() : Promise.reject(new Error("The document logo could not load. Use Save PDF or try again."));
      return new Promise<void>((resolve, reject) => {
        const cleanup = () => { clearTimeout(timer); img.removeEventListener("load", loaded); img.removeEventListener("error", failed); };
        const loaded = () => { cleanup(); resolve(); }, failed = () => { cleanup(); reject(new Error("The document logo could not load. Use Save PDF or try again.")); };
        const timer = setTimeout(() => { cleanup(); reject(new Error("The logo is taking too long to load. Use Save PDF or try Print again.")); }, 5000);
        img.addEventListener("load", loaded, { once: true }); img.addEventListener("error", failed, { once: true });
      });
    }));
    if (!frame.isConnected) return;
    status.textContent = "Ready to print.";
    if (autoPrint) { popup.addEventListener("afterprint", () => frame.remove(), { once: true }); popup.focus(); popup.print(); }
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Print could not open. Use Save PDF or try again.";
    frame.remove();
    throw error;
  }
}

export function serviceDocumentPdfHref(repairOrderId: string, documentId: string) {
  return `/api/repair-orders/${encodeURIComponent(repairOrderId)}/documents/${encodeURIComponent(documentId)}/pdf`;
}
