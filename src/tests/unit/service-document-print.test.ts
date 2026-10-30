import { afterEach, describe, expect, it, vi } from "vitest";
import { openServiceDocumentPrint, serviceDocumentPdfHref } from "@/lib/service-document-print";
afterEach(() => vi.unstubAllGlobals());
function printFixture() {
  const copy = { querySelectorAll: vi.fn().mockReturnValue([]) };
  const source = { querySelector: vi.fn().mockReturnValue({ textContent: "Repair Estimate" }), querySelectorAll: vi.fn().mockReturnValue([]), cloneNode: vi.fn().mockReturnValue(copy) };
  const elements: { textContent: string; append: ReturnType<typeof vi.fn>; setAttribute: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn> }[] = [];
  const popup = { focus: vi.fn(), print: vi.fn(), addEventListener: vi.fn(), document: { title: "", documentElement: { lang: "" }, head: { append: vi.fn() }, body: { replaceChildren: vi.fn() }, createElement: vi.fn(() => { const element = { textContent: "", append: vi.fn(), setAttribute: vi.fn(), addEventListener: vi.fn() }; elements.push(element); return element; }) } };
  const frame = { contentWindow: popup, isConnected: true, title: "", style: { cssText: "" }, setAttribute: vi.fn(), remove: vi.fn() };
  const document = { querySelector: vi.fn().mockReturnValue(null), createElement: vi.fn().mockReturnValue(frame), body: { append: vi.fn() } };
  const window = { open: vi.fn(), print: vi.fn() };
  vi.stubGlobal("window", window); vi.stubGlobal("document", document);
  return { copy, source, popup, window, frame, document };
}
describe("isolated document printing", () => {
  it("prepares immediately from the click and prints only a cloned document, never the app window", async () => {
    const { source, copy, popup, window, document } = printFixture();
    const pending = openServiceDocumentPrint(source as never);
    expect(document.createElement).toHaveBeenCalledWith("iframe");
    expect(window.open).not.toHaveBeenCalled();
    await pending;
    expect(source.cloneNode).toHaveBeenCalledWith(true);
    expect(popup.document.body.replaceChildren).toHaveBeenCalledWith(expect.any(Object), copy);
    expect(popup.print).toHaveBeenCalledOnce();
    expect(window.print).not.toHaveBeenCalled();

  });
  it("offers Save PDF if a print frame cannot open, without waiting indefinitely", async () => {
    const { source, window, frame } = printFixture();
    frame.contentWindow = null as never;
    await expect(openServiceDocumentPrint(source as never)).rejects.toThrow("Use Save PDF");
    expect(window.print).not.toHaveBeenCalled();
  });
  it("supports reviewing the isolated print copy without invoking the printer", async () => {
    const { source, popup } = printFixture();
    await openServiceDocumentPrint(source as never, false);
    expect(popup.document.title).toBe("Repair Estimate");
    expect(popup.print).not.toHaveBeenCalled();
  });
  it("pins downloads to the exact saved document using safely encoded IDs", () => {
    expect(serviceDocumentPdfHref("ro/1", "doc/2")).toBe("/api/repair-orders/ro%2F1/documents/doc%2F2/pdf");
  });
});
