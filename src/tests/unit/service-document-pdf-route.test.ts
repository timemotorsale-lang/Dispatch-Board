import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn(), pdf: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => ({ id: "staff" }) }));
vi.mock("@/server/repair-order/document-service", () => ({ getServiceDocumentForPrint: mocks.read }));
vi.mock("@/server/repair-order/service-document-pdf", async importOriginal => ({ ...await importOriginal<typeof import("@/server/repair-order/service-document-pdf")>(), createServiceDocumentPdf: mocks.pdf }));
import { GET } from "@/app/api/repair-orders/[id]/documents/[documentId]/pdf/route";
const context = { params: Promise.resolve({ id: "ro-1", documentId: "doc-1" }) };
beforeEach(() => { vi.resetAllMocks(); mocks.read.mockResolvedValue({ content: { number: "RO-1 / v2" } }); mocks.pdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70])); });
describe("Save PDF response", () => {
  it("downloads a private, uncached PDF for the exact saved document", async () => {
    const response = await GET(new Request("http://local/pdf"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="RO-1-v2.pdf"');
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.read).toHaveBeenCalledWith({ id: "staff" }, "ro-1", "doc-1");
  });
  it("returns readable recovery guidance without exposing database errors", async () => {
    mocks.pdf.mockRejectedValue(new Error("Secret database detail"));
    const response = await GET(new Request("http://local/pdf"), context);
    expect(response.status).toBe(500);
    const html = await response.text();
    expect(html).toContain("Return to the document"); expect(html).not.toContain("Secret database detail");
  });
  it("preserves authorization failures and never starts PDF generation", async () => {
    mocks.read.mockRejectedValue(new Error("Vehicle capability required: SERVICE_BILLING_VIEW"));
    expect((await GET(new Request("http://local/pdf"), context)).status).toBe(403);
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
});
