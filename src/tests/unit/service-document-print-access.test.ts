import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
const mocks = vi.hoisted(() => ({ document: vi.fn(), order: vi.fn(), history: vi.fn(), authors: vi.fn(), detail: vi.fn(), grants: vi.fn(), billing: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { serviceDocument: { findFirst: mocks.document, findMany: mocks.history }, repairOrder: { findFirst: mocks.order }, user: { findMany: mocks.authors } } }));
vi.mock("@/server/repair-order/service", () => ({ getRepairOrderDetail: mocks.detail }));
vi.mock("@/server/service-billing/service", () => ({ billingAccess: mocks.billing }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants }) }));
import { getServiceDocumentForPrint } from "@/server/repair-order/document-service";
const actor = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const content = { title: "Saved estimate", number: "RO-1", lines: [], notes: [] };
const document = { id: "doc-1", kind: "ESTIMATE", organizationId: "org-time-motor-sales", repairOrderId: "ro-1", templateVersion: "v4", content, sha256: hashEnterpriseCommand({ templateVersion: "v4", content }) };
beforeEach(() => { vi.resetAllMocks(); mocks.grants.mockResolvedValue([]); mocks.order.mockResolvedValue({ locationId: "loc-1" }); mocks.document.mockResolvedValue(document); mocks.billing.mockResolvedValue(undefined); });
describe("lightweight PDF access", () => {
  it("loads only the selected scoped document without the full RO or history", async () => {
    expect(await getServiceDocumentForPrint(actor, "ro-1", "doc-1")).toMatchObject({ content });
    expect(mocks.document).toHaveBeenCalledWith({ where: { id: "doc-1", repairOrderId: "ro-1", organizationId: "org-time-motor-sales" } });
    for (const expensive of [mocks.detail, mocks.history, mocks.authors]) expect(expensive).not.toHaveBeenCalled();
  });
  it("requires authentication and rejects corrupt snapshots", async () => {
    await expect(getServiceDocumentForPrint(null, "ro-1", "doc-1")).rejects.toThrow("Authentication required");
    expect(mocks.document).not.toHaveBeenCalled();
    mocks.document.mockResolvedValue({ ...document, sha256: "corrupt" });
    await expect(getServiceDocumentForPrint(actor, "ro-1", "doc-1")).rejects.toThrow("integrity");
  });
  it("enforces location restrictions and financial read permissions", async () => {
    mocks.grants.mockResolvedValue([{ capability: "REPAIR_ORDER_VIEW", effect: "DENY", locationId: "loc-1", validFrom: new Date(0), validTo: null }]);
    await expect(getServiceDocumentForPrint(actor, "ro-1", "doc-1")).rejects.toThrow("Vehicle capability required");
    expect(mocks.document).not.toHaveBeenCalled();
    mocks.grants.mockResolvedValue([]); mocks.document.mockResolvedValue({ ...document, kind: "INVOICE" }); mocks.billing.mockRejectedValue(new Error("Vehicle capability required: SERVICE_BILLING_VIEW"));
    await expect(getServiceDocumentForPrint(actor, "ro-1", "doc-1")).rejects.toThrow("SERVICE_BILLING_VIEW");
  });
  it("rejects a document that does not belong to the requested RO", async () => {
    mocks.document.mockResolvedValue(null);
    await expect(getServiceDocumentForPrint(actor, "another-ro", "doc-1")).rejects.toThrow("not found");
  });
});
