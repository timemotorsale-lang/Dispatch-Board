import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VehicleCapabilityGrantRecord } from "@/server/enterprise-command/vehicle-capabilities";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

const mocks = vi.hoisted(() => ({ grants: vi.fn(), order: vi.fn(), document: vi.fn(), invoice: vi.fn(), entries: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { repairOrder: { findFirst: mocks.order }, serviceDocument: { findFirst: mocks.document }, serviceInvoice: { findFirst: mocks.invoice }, serviceInvoiceEntry: { findMany: mocks.entries } } }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants }) }));

import { getServiceDocumentForPrint } from "@/server/repair-order/document-service";
import { getRepairBillingRecord } from "@/server/repair-order/billing-record";
import { getRepairOrderDetail, listRepairOrders } from "@/server/repair-order/service";
import { getShopPlanningDetail } from "@/server/shop-planning/service";
import { createRepairOrderRepository } from "@/server/repair-order/repository";

const sales = { id: "sales", name: "Sales", email: "sales@example.test", isActive: true, roles: ["Sales"], duties: { all: [], direct: [], roleDefaults: [] } };
const grant = (capability: string, locationId: string | null, effect: "ALLOW" | "DENY" = "ALLOW"): VehicleCapabilityGrantRecord => ({ capability, locationId, effect, validFrom: new Date(0), validTo: null });
const order = { id: "ro-a", locationId: "store-a", repairOrderNumber: "RO-A", openedAt: new Date(), stageStartedAt: new Date(), targetAt: new Date() };
const content = { title: "Frozen estimate" };
const document = { id: "doc", kind: "ESTIMATE", templateVersion: "v1", content, sha256: hashEnterpriseCommand({ templateVersion: "v1", content }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.grants.mockResolvedValue([grant("REPAIR_ORDER_VIEW", "store-a")]);
  mocks.order.mockResolvedValue(order); mocks.document.mockResolvedValue(document);
  mocks.invoice.mockResolvedValue({ id: "invoice-a" }); mocks.entries.mockResolvedValue([]);
});

describe("Sales location-scoped repair reads", () => {
  it.each(["DEPOSIT", "DEPOSIT_REFUND", "DEPOSIT_APPLICATION", "DEPOSIT_REVERSAL"])("requires financial access for exact %s print and PDF source", async kind => {
    mocks.document.mockResolvedValue({ ...document, kind });
    await expect(getServiceDocumentForPrint(sales, "ro-a", "doc")).rejects.toThrow("SERVICE_BILLING_VIEW");
    mocks.grants.mockResolvedValue([grant("REPAIR_ORDER_VIEW", "store-a"), grant("SERVICE_BILLING_VIEW", "store-a")]);
    await expect(getServiceDocumentForPrint(sales, "ro-a", "doc")).resolves.toMatchObject({ kind });
    mocks.grants.mockResolvedValue([grant("REPAIR_ORDER_VIEW", "store-a"), grant("SERVICE_BILLING_VIEW", "store-a"), grant("SERVICE_BILLING_VIEW", "store-a", "DENY")]);
    await expect(getServiceDocumentForPrint(sales, "ro-a", "doc")).rejects.toThrow("SERVICE_BILLING_VIEW");
  });
  it("prints estimates in the allowed store without billing or organization-wide grants", async () => {
    await expect(getServiceDocumentForPrint(sales, "ro-a", "doc")).resolves.toMatchObject({ id: "doc" });
    expect(mocks.order).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "ro-a", organizationId: expect.any(String) } }));
  });
  it.each(["store-b", "store-a"])("blocks document metadata in an ungranted or explicitly denied store: %s", async locationId => {
    mocks.order.mockResolvedValue({ ...order, locationId });
    if (locationId === "store-a") mocks.grants.mockResolvedValue([grant("REPAIR_ORDER_VIEW", "store-a"), grant("REPAIR_ORDER_VIEW", "store-a", "DENY")]);
    await expect(getServiceDocumentForPrint(sales, "ro-a", "doc")).rejects.toThrow("REPAIR_ORDER_VIEW");
    expect(mocks.document).not.toHaveBeenCalled();
  });
  it("requires a same-store billing view grant for financial print and billing records", async () => {
    mocks.document.mockResolvedValue({ ...document, kind: "INVOICE" });
    await expect(getServiceDocumentForPrint(sales, "ro-a", "doc")).rejects.toThrow("SERVICE_BILLING_VIEW");
    await expect(getRepairBillingRecord(sales, { repairOrderId: "ro-a", invoiceId: "invoice-a" })).rejects.toThrow("SERVICE_BILLING_VIEW");
    expect(mocks.invoice).not.toHaveBeenCalled();
    mocks.grants.mockResolvedValue([grant("REPAIR_ORDER_VIEW", "store-a"), grant("SERVICE_BILLING_VIEW", "store-a")]);
    await expect(getServiceDocumentForPrint(sales, "ro-a", "doc")).resolves.toMatchObject({ kind: "INVOICE" });
    await expect(getRepairBillingRecord(sales, { repairOrderId: "ro-a", invoiceId: "invoice-a" })).resolves.toMatchObject({ kind: "invoice" });
    mocks.grants.mockResolvedValue([grant("REPAIR_ORDER_VIEW", "store-a"), grant("SERVICE_BILLING_VIEW", "store-a"), grant("SERVICE_BILLING_VIEW", "store-a", "DENY")]);
    await expect(getRepairBillingRecord(sales, { repairOrderId: "ro-a", invoiceId: "invoice-a" })).rejects.toThrow("EXPLICIT_DENY");
  });
  it("keeps anonymous and unprivileged requests out before resolving records", async () => {
    await expect(getServiceDocumentForPrint(null, "ro-a", "doc")).rejects.toThrow("Authentication required");
    mocks.grants.mockResolvedValue([]);
    await expect(getRepairBillingRecord(sales, { repairOrderId: "ro-a", invoiceId: "invoice-a" })).rejects.toThrow("REPAIR_ORDER_VIEW");
    expect(mocks.order).not.toHaveBeenCalled();
  });
  it("authorizes both RO detail and planning detail at the resolved store", async () => {
    const repository = { getDetail: vi.fn().mockResolvedValue(order), get: vi.fn().mockResolvedValue(order) };
    const options = { repository: repository as never, foundationRepository: { listCapabilityGrants: mocks.grants } as never };
    await expect(getRepairOrderDetail(sales, "ro-a", options)).resolves.toMatchObject({ id: "ro-a" });
    await expect(getShopPlanningDetail(sales, "ro-a", options)).resolves.toMatchObject({ id: "ro-a" });
    repository.getDetail.mockResolvedValue({ ...order, locationId: "store-b" });
    repository.get.mockResolvedValue({ ...order, locationId: "store-b" });
    await expect(getRepairOrderDetail(sales, "ro-a", options)).rejects.toThrow("REPAIR_ORDER_VIEW");
    await expect(getShopPlanningDetail(sales, "ro-a", options)).rejects.toThrow("REPAIR_ORDER_VIEW");
  });
  it("restricts directory counts and pagination before querying repair records", async () => {
    const search = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const readLocations = vi.fn().mockResolvedValue([{ id: "store-a" }, { id: "store-b" }]);
    const options = { repository: { search, readLocations } as never, foundationRepository: { listCapabilityGrants: mocks.grants } as never };
    await listRepairOrders(sales, {}, options);
    expect(search).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ allowedLocationIds: ["store-a"] }));
    search.mockClear(); readLocations.mockResolvedValue([{ id: "store-b" }]);
    await expect(listRepairOrders(sales, {}, options)).rejects.toThrow("NO_ACCESSIBLE_LOCATION");
    expect(search).not.toHaveBeenCalled();
  });
  it("applies the same location allowlist to repository rows and total counts", async () => {
    const findMany = vi.fn().mockResolvedValue([]), count = vi.fn().mockResolvedValue(0);
    const repository = createRepairOrderRepository({ repairOrder: { findMany, count } } as never);
    await repository.search("org", { query: "", page: 2, pageSize: 10, allowedLocationIds: ["store-a"] });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", locationId: { in: ["store-a"] } }), skip: 10, take: 10 }));
    expect(count).toHaveBeenCalledWith({ where: findMany.mock.calls[0][0].where });
  });
});
