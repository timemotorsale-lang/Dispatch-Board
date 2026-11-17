import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ actor: vi.fn(), save: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mock.actor }));
vi.mock("@/server/sales-documents/service", () => ({ saveSalesDocument: mock.save }));
import { POST } from "@/app/api/sales-documents/[jacketId]/documents/route";

describe("sales scan upload route", () => {
  beforeEach(() => { vi.clearAllMocks(); mock.actor.mockResolvedValue({ id: "staff" }); mock.save.mockResolvedValue({ id: "jacket-1" }); });
  function request(method: string) {
    const form = new FormData();
    form.set("file", new File(["%PDF-sample"], "sample.pdf", { type: "application/pdf" }));
    form.set("documentType", "sales-agreement");
    form.set("captureMethod", method);
    form.set("revision", "3");
    return new Request("http://local.test/api/sales-documents/jacket-1/documents", { method: "POST", body: form });
  }
  it("passes a scan through the existing authenticated jacket service", async () => {
    const response = await POST(request("DOCUMENT_SCAN"), { params: Promise.resolve({ jacketId: "jacket-1" }) });
    expect(response.status).toBe(201);
    expect(mock.save).toHaveBeenCalledWith({ id: "staff" }, "jacket-1", expect.objectContaining({ captureMethod: "DOCUMENT_SCAN", expectedRevision: 3, documentType: "sales-agreement" }));
    expect(mock.save.mock.calls[0][2]).not.toHaveProperty("generated");
  });
  it("rejects unsupported capture classifications", async () => {
    const response = await POST(request("AUTO_VERIFIED_SIGNATURE"), { params: Promise.resolve({ jacketId: "jacket-1" }) });
    expect(response.status).toBe(400);
    expect(mock.save).not.toHaveBeenCalled();
  });
});
