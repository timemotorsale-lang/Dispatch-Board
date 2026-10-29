import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
const mocks = vi.hoisted(() => ({ customer: vi.fn(), charges: vi.fn(), read: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => ({ id: "operator" }) }));
vi.mock("@/server/repair-order/document-review-service", () => ({ getServiceDocumentReview: mocks.read, updateServiceDocumentCustomer: mocks.customer, reviseServiceDocumentCharges: mocks.charges }));
import { POST } from "@/app/api/repair-orders/[id]/document-review/route";
const context = { params: Promise.resolve({ id: "ro-1" }) };
const request = (action = "CUSTOMER_DETAILS") => new Request("http://local/api/repair-orders/ro-1/document-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, documentId: "doc-1" }) });
beforeEach(() => { vi.resetAllMocks(); });
describe("document review save outcomes", () => {
  it("keeps an uncertain database outcome retryable with the same request", async () => {
    const failure = new Error("Connection dropped"); failure.name = "PrismaClientUnknownRequestError";
    mocks.customer.mockRejectedValue(failure);
    const response = await POST(request(), context);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("unchanged request");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("reports known document-version conflicts distinctly", async () => {
    mocks.customer.mockRejectedValue(new EnterpriseCommandConflictError("Document changed", "VERSION_CONFLICT"));
    expect((await POST(request(), context)).status).toBe(409);
  });
  it("dispatches charge edits and rejects unknown actions without a mutation", async () => {
    mocks.charges.mockResolvedValue({ result: { id: "estimate-2" } });
    expect((await POST(request("CHARGES"), context)).status).toBe(200);
    expect(mocks.charges).toHaveBeenCalledWith({ id: "operator" }, "ro-1", { action: "CHARGES", documentId: "doc-1" });
    expect((await POST(request("UNKNOWN"), context)).status).toBe(400);
    expect(mocks.charges).toHaveBeenCalledTimes(1);
    expect(mocks.customer).not.toHaveBeenCalled();
  });
});
