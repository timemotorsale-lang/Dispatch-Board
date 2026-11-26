"use client";

export async function printCapture(input: File | string, contentType: string) {
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow the print window in your browser, then try again.");
  popup.opener = null;
  popup.document.title = "Print capture";
  popup.document.body.textContent = "Preparing capture…";
  let url = "";
  try {
    const blob = typeof input === "string" ? await fetch(input, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("This capture cannot be opened. Refresh the archive or check your access.");
      return response.blob();
    }) : input;
    if (popup.closed) return;
    url = URL.createObjectURL(blob);
    if (contentType === "application/pdf") {
      popup.location.replace(url);
    } else {
      const image = popup.document.createElement("img");
      const button = popup.document.createElement("button");
      const style = popup.document.createElement("style");
      style.textContent = "body{margin:16px;font:16px system-ui}img{display:block;max-width:100%;max-height:92vh;object-fit:contain;margin:12px auto}button{font:inherit;padding:8px 16px}@media print{body{margin:0}button{display:none}}";
      popup.document.head.append(style);
      button.type = "button";
      button.textContent = "Print";
      button.disabled = true;
      button.addEventListener("click", () => popup.print());
      image.alt = "Capture to print";
      image.addEventListener("load", () => { button.disabled = false; }, { once: true });
      image.addEventListener("error", () => { popup.document.body.textContent = "This image could not be opened for printing."; }, { once: true });
      image.src = url;
      popup.document.body.replaceChildren(button, image);
    }
    const objectUrl = url;
    // Keep the blob available for the popup's PDF viewer until the window closes.
    const cleanup = window.setInterval(() => {
      if (popup.closed) { URL.revokeObjectURL(objectUrl); window.clearInterval(cleanup); }
    }, 1000);
  } catch (error) {
    if (url) URL.revokeObjectURL(url);
    if (!popup.closed) popup.document.body.textContent = error instanceof Error ? error.message : "Could not open the print window.";
    throw error;
  }
}
