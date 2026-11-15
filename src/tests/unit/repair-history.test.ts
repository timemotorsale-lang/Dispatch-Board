import { describe, expect, it, vi } from "vitest";
import type { PrismaClient, Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { normalizeRepairHistoryQuery, searchRepairHistory } from "@/server/repair-order/history";
import type { VehicleCapabilityGrantRecord } from "@/server/enterprise-command/vehicle-capabilities";

vi.mock("@/server/db/client", () => ({ prisma: {} }));
const actor: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const now = new Date("2026-11-14T12:00:00Z");
function fixture(grants: VehicleCapabilityGrantRecord[] = []) {
  const query = vi.fn().mockResolvedValue([]);
  const orders = vi.fn().mockResolvedValue([]), documents = vi.fn().mockResolvedValue([]);
  const database = { location: { findMany: vi.fn().mockResolvedValue([{ id: "store-a" }, { id: "store-b" }]) }, $queryRaw: query, repairOrder: { findMany: orders }, serviceDocument: { findMany: documents }, serviceInvoicePackage: { findMany: vi.fn().mockResolvedValue([]) }, serviceInvoice: { findMany: vi.fn().mockResolvedValue([]) }, serviceInvoiceEntry: { findMany: vi.fn().mockResolvedValue([]) }, autobodyEstimateDraft: { findMany: vi.fn().mockResolvedValue([]) }, diagnosticWorkspaceDraft: { findMany: vi.fn().mockResolvedValue([]) } };
  return { query, orders, documents, database, input: { database: database as unknown as PrismaClient, organizationId: "org", now, foundation: { listCapabilityGrants: vi.fn().mockResolvedValue(grants) } } };
}
const deny = (capability: string, locationId: string | null): VehicleCapabilityGrantRecord => ({ capability, effect: "DENY", locationId, validFrom: new Date(0), validTo: null });

describe("repair history", () => {
  it("defaults to all history without a date or open-only cutoff", async () => {
    const f = fixture();
    expect(await searchRepairHistory(actor, {}, f.input)).toEqual({ items: [], page: 1, hasMore: false });
    const sql = f.query.mock.calls[0][0] as Prisma.Sql;
    expect(sql.text).not.toContain('AND r."closedAt" IS NULL');
    expect(sql.values).toContain("org");
    expect(sql.text).toContain('ld."userId" =');
    expect(sql.values).toContain(actor.id);
  });
  it.each([{ page: -1 }, { page: "NaN" }, { pageSize: 51 }, { page: 1.5 }, { kind: "PAYMENT" }, { state: "UNKNOWN" }, { query: "x".repeat(201) }, { vehicleId: "../other" }])("rejects invalid filters %j", value => {
    expect(() => normalizeRepairHistoryQuery(value)).toThrow();
  });
  it("requires authentication and repair capability before reading history", async () => {
    const f = fixture();
    await expect(searchRepairHistory(null, {}, f.input)).rejects.toThrow("Authentication required");
    await expect(searchRepairHistory({ ...actor, roles: [] }, {}, f.input)).rejects.toThrow("REPAIR_ORDER_VIEW");
    expect(f.query).not.toHaveBeenCalled();
    expect(f.database.location.findMany).not.toHaveBeenCalled();
  });
  it("honors store denial even for general managers", async () => {
    const f = fixture([deny("REPAIR_ORDER_VIEW", "store-b")]);
    await searchRepairHistory(actor, {}, f.input);
    expect(f.orders).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", locationId: { in: ["store-a"] } }) }));
    expect((f.query.mock.calls[0][0] as Prisma.Sql).values).not.toContain("store-b");
  });
  it("accepts a Sales user's local grant and excludes other stores before pagination", async () => {
    const f = fixture([{ ...deny("REPAIR_ORDER_VIEW", "store-a"), effect: "ALLOW" }, deny("REPAIR_ORDER_VIEW", "store-b")]);
    await searchRepairHistory({ ...actor, roles: ["Sales"] }, { query: "invoice-reference" }, f.input);
    expect(f.orders).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ locationId: { in: ["store-a"] } }) }));
    expect((f.query.mock.calls[0][0] as Prisma.Sql).values).not.toContain("store-b");
    expect((f.query.mock.calls[0][0] as Prisma.Sql).text).toContain("OR FALSE");
  });
  it("returns empty history for a globally eligible manager denied every store", async () => {
    const f = fixture([deny("REPAIR_ORDER_VIEW", "store-a"), deny("REPAIR_ORDER_VIEW", "store-b")]);
    await expect(searchRepairHistory(actor, {}, f.input)).resolves.toEqual({ items: [], page: 1, hasMore: false });
    expect(f.query).not.toHaveBeenCalled();
    expect(f.orders).not.toHaveBeenCalled();
  });
  it("does not accept an expired grant or override a global deny", async () => {
    for (const grants of [
      [{ ...deny("REPAIR_ORDER_VIEW", "store-a"), effect: "ALLOW" as const, validTo: new Date(1) }],
      [{ ...deny("REPAIR_ORDER_VIEW", "store-a"), effect: "ALLOW" as const }, deny("REPAIR_ORDER_VIEW", null)]
    ]) {
      const f = fixture(grants);
      await expect(searchRepairHistory({ ...actor, roles: ["Sales"] }, {}, f.input)).rejects.toThrow("REPAIR_ORDER_VIEW");
      expect(f.query).not.toHaveBeenCalled();
    }
  });
  it("does not let search terms inspect financial documents without billing permission", async () => {
    const f = fixture();
    await searchRepairHistory({ ...actor, roles: ["Mechanic"] }, { query: "private-payment", kind: "RECEIPT" }, f.input);
    const sql = f.query.mock.calls[0][0] as Prisma.Sql;
    expect(sql.text).toContain("AND FALSE AND (EXISTS");
    expect(sql.text).toContain("OR FALSE");
    expect(sql.text).not.toContain("private-payment");
    expect(sql.values).toContain("%private-payment%");
  });
  it("parameterizes literal wildcard and quote searches", async () => {
    const f = fixture();
    await searchRepairHistory(actor, { query: "O'Brien_10%", page: 3, pageSize: 10 }, f.input);
    const sql = f.query.mock.calls[0][0] as Prisma.Sql;
    expect(sql.text).not.toContain("O'Brien");
    expect(sql.values).toContain("%O'Brien\\_10\\%%");
    expect(sql.values.slice(-2)).toEqual([11, 20]);
  });
  it("returns exact saved document versions for a closed repair without writing", async () => {
    const f = fixture();
    f.query.mockResolvedValue([{ id: "old-order", source: "REPAIR_ORDER", updatedAt: now }]);
    f.orders.mockResolvedValue([{ id: "old-order", locationId: "store-a", repairOrderNumber: "RO-OLD", closedAt: new Date("2020-01-02"), operatingState: "ACTIVE", updatedAt: now, serviceVisit: { concernSummary: "Engine repair" }, customer: { displayName: "Customer" }, vehicle: { year: 2010, make: "Ford", model: "Fusion", vin: "VIN", stockNumber: "OLD", vehicleNumber: "V1" }, autobodyDrafts: [], estimateVersions: [], diagnosticEstimateDrafts: [], shopReconLifecycle: null }]);
    f.documents.mockResolvedValue([{ id: "estimate-v1", repairOrderId: "old-order", kind: "ESTIMATE", sourceVersion: 1, createdAt: now, content: { number: "RO-OLD / v1", issuedAt: "2020-01-01T00:00:00.000Z" } }, { id: "estimate-v2", repairOrderId: "old-order", kind: "ESTIMATE", sourceVersion: 2, createdAt: now, content: { number: "RO-OLD / v2" } }]);
    f.database.serviceInvoicePackage.findMany.mockResolvedValue([{ id: "old-package", repairOrderId: "old-order", externalReference: "EXTERNAL-19", version: 2, generatedAt: now }]);
    f.database.serviceInvoice.findMany.mockResolvedValue([{ id: "old-invoice", repairOrderId: "old-order", invoiceNumber: "INV-19", version: 1, issuedAt: now }]);
    f.database.serviceInvoiceEntry.findMany.mockResolvedValue([{ id: "old-payment", invoiceId: "old-invoice", kind: "PAYMENT", reference: "CHECK-19", occurredAt: now }]);
    const result = await searchRepairHistory(actor, {}, f.input);
    expect(result.items[0].status).toBe("CLOSED");
    expect(result.items[0].documents[0]).toMatchObject({ version: 1, issuedAt: "2020-01-01T00:00:00.000Z", href: "/service-documents?repairOrderId=old-order&documentId=estimate-v1&workspace=1" });
    expect(result.items[0].documents).toHaveLength(5);
    expect(result.items[0].documents.slice(2).map(document => document.href)).toEqual([
      "/repair-billing-record?repairOrderId=old-order&packageId=old-package",
      "/repair-billing-record?repairOrderId=old-order&invoiceId=old-invoice",
      "/repair-billing-record?repairOrderId=old-order&entryId=old-payment",
    ]);
  });
  it("uses a lookahead row for pagination without dropping older records", async () => {
    const f = fixture();
    f.query.mockResolvedValue([{ id: "one", source: "LABOR_DRAFT", updatedAt: now }, { id: "two", source: "LABOR_DRAFT", updatedAt: now }]);
    f.database.diagnosticWorkspaceDraft.findMany.mockResolvedValue([{ id: "one", title: "Archived quote", version: 4, updatedAt: now, content: { archivedAt: now.toISOString(), manual: { customer: "Old customer", vehicle: "Old car", vin: "OLDVIN" } } }]);
    const result = await searchRepairHistory(actor, { pageSize: 1 }, f.input);
    expect(result).toMatchObject({ page: 1, hasMore: true, items: [{ source: "LABOR_DRAFT", status: "ARCHIVED", href: "/prototype/repair-explorer?draftId=one" }] });
    expect(f.database.diagnosticWorkspaceDraft.findMany).toHaveBeenCalledWith({ where: { userId: actor.id, id: { in: ["one"] } } });
  });
});
