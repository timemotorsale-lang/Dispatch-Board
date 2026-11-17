import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { SalesDocumentScan } from "@/features/sales-documents/sales-document-scan";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";

const jacket = { id: "sample-jacket", state: "WORKING", requirements: [], revision: 1 } as unknown as SalesDocumentJacketView;
describe("optional sales document scanning", () => {
  it("leaves scanning optional and waits for staff to open it", () => {
    const markup = renderToStaticMarkup(<SalesDocumentScan jacket={jacket} onSaved={vi.fn()} onBusyChange={vi.fn()} />);
    expect(markup).toContain("Scan paper documents");
    expect(markup).toContain("Continue scanning on a phone");
    expect(markup).not.toContain('role="dialog"');
    expect(markup).not.toContain("Save scan to this deal");
  });
  it("keeps closed jackets locked even when a phone link requests scanning", () => {
    const markup = renderToStaticMarkup(<SalesDocumentScan jacket={{ ...jacket, state: "CLOSED" }} initialScan onSaved={vi.fn()} onBusyChange={vi.fn()} />);
    expect(markup).toContain("This jacket is finalized");
    expect(markup).not.toContain('role="dialog"');
    expect(markup).toContain("disabled");
  });
});
