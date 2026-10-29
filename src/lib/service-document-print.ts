"use client";

// Deliberately independent of global app CSS, navigation, dialogs and web fonts.
export const SERVICE_DOCUMENT_PRINT_CSS = `
@page { size: letter; margin: 14mm; }
* { box-sizing: border-box; }
body { margin: 0; background: white; color: #172334; font: 11px/1.5 Arial, sans-serif; }
article { width: 100%; max-width: 900px; margin: 24px auto; padding: 20px; }
header { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border-top: 4px solid #244f87; border-bottom: 1px solid #cad6e5; padding: 20px 0; margin-bottom: 18px; break-inside: avoid; }
header img { display: block; width: 240px; max-width: 100%; height: auto; margin-bottom: 12px; }
h1 { margin: 6px 0 14px; font-size: 23px; } h2 { font-size: 13px; break-after: avoid; }
header p { margin: 6px 0; } header a { color: #244f87; margin-right: 12px; }
header > div:last-child { background: #f1f5fa; padding: 16px; border-radius: 8px; }
header > div:last-child > div { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
header span, header strong, header small { display: block; }
header span { color: #526477; font-size: 10px; }
section { margin: 14px 0; } section p { margin: 4px 0; }
[data-print-vehicle] { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: 10px; color: #526477; }
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
footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; border-top: 1px solid #cbd5e1; margin-top: 24px; padding-top: 10px; font-size: 9px; color: #526477; break-inside: avoid; }
.print-controls { padding: 12px; background: #f1f5fa; font-size: 13px; } .print-controls button { padding: 8px 20px; cursor: pointer; } .print-controls span { margin-left: 12px; }
@media print { article { max-width: none; margin: 0; padding: 0; } .print-controls { display: none; } a { color: inherit; text-decoration: none; } header > div:last-child { background: white; border: 1px solid #cad6e5; } }
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
