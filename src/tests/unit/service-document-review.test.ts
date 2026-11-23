import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { getLaborGuideRevision, getServiceDocumentReview, updateServiceDocumentCustomer, reviseServiceDocumentCharges } from "@/server/repair-order/document-review-service";
import { normalizeDocumentCustomer } from "@/lib/service-document-review";
const mocks = vi.hoisted(() => ({
  db: { repairJob: { findFirst: vi.fn() }, repairOrder: { findFirst: vi.fn() }, serviceDocument: { findFirst: vi.fn(), create: vi.fn() }, repairEstimateVersion: { findFirst: vi.fn() }, serviceInvoice: { findFirst: vi.fn() }, enterpriseCommandLedger: { findUnique: vi.fn(), create: vi.fn() }, enterpriseAuditEvent: { create: vi.fn() }, $transaction: vi.fn() },
  grants: vi.fn(), flags: vi.fn(), billing: vi.fn(), present: vi.fn(),
}));
vi.mock("@/server/db/client", () => ({ prisma: mocks.db }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants, listFeatureFlags: mocks.flags }) }));
vi.mock("@/server/service-billing/service", () => ({ billingAccess: mocks.billing }));
vi.mock("@/server/services/labor-rate-settings", () => ({ getActiveLaborRate: vi.fn().mockResolvedValue({ laborRate: 125 }) }));
vi.mock("@/server/shop-planning/service", () => ({ presentRepairEstimate: mocks.present }));
const actor = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const identity = { customer: "Customer", vehicle: "Vehicle", vin: "VIN", vehicleNumber: "VEH-1", concern: "Repair", repairOrderNumber: "RO-1", store: "Time Motor Sales", address: "Store", timezone: "America/Chicago" };
const content = { title: "Estimate", number: "RO-1 / v1", issuedAt: "2026-10-29T12:00:00Z", identity, lines: [{ key: "work", type: "LABOR", description: "Repair", quantity: 1, unitPriceCents: 25000, totalCents: 25000 }], totals: { subtotalCents: 25000, discountCents: 0, taxCents: 0, totalCents: 25000 }, notes: [] };
const source = { id: "doc-1", organizationId: "org-time-motor-sales", repairOrderId: "ro-1", kind: "ESTIMATE", sourceId: "estimate-1", sourceVersion: 1, templateVersion: "service-document-v2", content, sha256: hashEnterpriseCommand({ templateVersion: "service-document-v2", content }) };
const customer = { name: "Customer Full Name", phone: "612-555-0100", email: "CUSTOMER@example.test", address: "123 Example St, Minneapolis, MN 55407" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.grants.mockResolvedValue([]);
  mocks.flags.mockResolvedValue([{ code: "VEHICLE_OPERATIONS_MASTER", mode: "GENERAL", locationId: null }, { code: "SHOP_OPERATIONS", mode: "GENERAL", locationId: "loc-1" }]);
  mocks.db.repairOrder.findFirst.mockResolvedValue({ id: "ro-1", locationId: "loc-1", version: 4, closedAt: null });
  mocks.db.serviceDocument.findFirst.mockResolvedValue(source);
  mocks.db.serviceDocument.create.mockImplementation(async ({ data }) => ({ id: "doc-2", ...data }));
  mocks.db.enterpriseCommandLedger.findUnique.mockResolvedValue(null);
  mocks.db.enterpriseCommandLedger.create.mockResolvedValue({ id: "ledger-1" });
  mocks.db.enterpriseAuditEvent.create.mockResolvedValue({});
  mocks.db.serviceInvoice.findFirst.mockResolvedValue(null);
  mocks.db.repairJob.findFirst.mockResolvedValue(null);
  mocks.db.repairEstimateVersion.findFirst.mockResolvedValue({ id: "estimate-1", lineItems: [{ ...content.lines[0], taxable: false, laborGuideMinutes: 120, workTypeCode: "LABOR", plannedCorrection: "Repair" }], discountCents: 0, optionGroups: { servicePricing: { taxRatePercent: 7 } }, taxBoundary: "Configured rate", presentationChannel: "INTERNAL", assumptions: null });
  mocks.present.mockResolvedValue({ result: { id: "estimate-2" } });
  mocks.db.$transaction.mockImplementation(async callback => callback(mocks.db));
});
describe("document customer and charge review", () => {
  it("validates contact fields without requiring unrelated sensitive identity data", () => {
    expect(normalizeDocumentCustomer(customer)).toEqual({ ...customer, email: "customer@example.test" });
    expect(() => normalizeDocumentCustomer({ ...customer, email: "invalid" })).toThrow("email");
    expect(() => normalizeDocumentCustomer({ ...customer, phone: "123" })).toThrow("phone");
  });
  it("appends an audited customer correction while preserving original financial amounts and document", async () => {
    const original = JSON.stringify(source);
    expect(await updateServiceDocumentCustomer(actor, "ro-1", { documentId: source.id, documentHash: source.sha256, customer, idempotencyKey: "save-customer-1" })).toEqual({ documentId: "doc-2" });
    const saved = mocks.db.serviceDocument.create.mock.calls[0][0].data;
    expect(saved.sourceVersion).toBe(2);
    expect(saved.content.identity.customerContact).toEqual({ phone: customer.phone, email: "customer@example.test", address: customer.address });
    expect(saved.content.totals).toEqual(content.totals);
    expect(saved.content.lines).toEqual(content.lines);
    expect(saved.sha256).toBe(hashEnterpriseCommand({ templateVersion: saved.templateVersion, content: saved.content }));
    expect(JSON.stringify(source)).toBe(original);
    expect(mocks.db.enterpriseAuditEvent.create).toHaveBeenCalled();
  });
  it("recovers the same saved correction on retry and rejects stale document edits", async () => {
    mocks.db.enterpriseCommandLedger.findUnique.mockImplementation(async () => ({ requestHash: mocks.db.enterpriseCommandLedger.create.mock.calls[0][0].data.requestHash, resultSnapshot: { documentId: "doc-2" } }));
    mocks.db.enterpriseCommandLedger.findUnique.mockResolvedValueOnce(null);
    const request = { documentId: source.id, documentHash: source.sha256, customer, idempotencyKey: "same-request" };
    await updateServiceDocumentCustomer(actor, "ro-1", request);
    await updateServiceDocumentCustomer(actor, "ro-1", request);
    expect(mocks.db.serviceDocument.create).toHaveBeenCalledTimes(1);
    mocks.db.enterpriseCommandLedger.findUnique.mockResolvedValue(null);
    await expect(updateServiceDocumentCustomer(actor, "ro-1", { ...request, documentHash: "stale", idempotencyKey: "stale-request" })).rejects.toThrow("changed");
    expect(mocks.db.serviceDocument.create).toHaveBeenCalledTimes(1);
  });
  it("requires existing repair-order permissions and refuses corrupt source documents", async () => {
    await expect(updateServiceDocumentCustomer({ ...actor, roles: [] }, "ro-1", { documentId: source.id, customer })).rejects.toThrow("Vehicle capability required");
    expect(mocks.db.serviceDocument.create).not.toHaveBeenCalled();
    mocks.db.serviceDocument.findFirst.mockResolvedValue({ ...source, sha256: "wrong" });
    await expect(getServiceDocumentReview(actor, "ro-1", source.id)).rejects.toThrow("integrity");
  });
  it("saves additional charges and discount as a new estimate, preserving labor scope", async () => {
    await reviseServiceDocumentCharges(actor, "ro-1", { documentId: source.id, estimateId: "estimate-1", expectedVersion: 4, charges: [{ id: "tow", description: "Towing", amountCents: 10000, taxable: false }], suppliesTaxable: true, taxRatePercent: 7, discountCents: 1000, customer, documentHash: source.sha256, idempotencyKey: "revise-charges", presentedAt: "2026-10-29T12:00:00Z", expiresAt: "2026-11-05T12:00:00Z" });
    const command = mocks.present.mock.calls[0][2];
    expect(command.chargeRevisionFrom).toBe("estimate-1");
    expect(command.discountCents).toBe(1000);
    expect(command.documentReview).toEqual({ documentId: source.id, documentHash: source.sha256, customer: normalizeDocumentCustomer(customer) });
    expect(command.lineItems[0]).toMatchObject({ key: "work", description: "Repair", unitPriceCents: 25000, laborGuideMinutes: 120 });
    expect(command.lineItems.slice(1).map((line: { unitPriceCents: number }) => line.unitPriceCents)).toEqual([1250, 10000]);
    expect(command.taxCents).toBe(85);
  });
  it("appends labor and two linked parts while keeping the previous rates and exact source", async () => {
    await reviseServiceDocumentCharges(actor, "ro-1", {
      action: "ADD_WORK", documentId: source.id, estimateId: source.sourceId, documentHash: source.sha256,
      expectedVersion: 4, laborRate: 125, taxRatePercent: 7, idempotencyKey: "add-work",
      additionalWork: { laborDescription: "Replace both front sway bar links", laborMinutes: "60", parts: [{ description: "Front sway bar link", partNumber: "LINK-1", quantity: "2", unitPrice: "42.50" }], reason: "Additional wear observed" },
    });
    const [,, command,, preservedKeys] = mocks.present.mock.calls[0];
    expect(command.chargeRevisionFrom).toBe(source.sourceId);
    expect(command.lineItems).toMatchObject([
      { key: "work", unitPriceCents: 25000 },
      { key: "additional-work-1", type: "LABOR", unitPriceCents: 12500 },
      { type: "PART", quantity: 2, unitPriceCents: 4250, laborLineKey: "additional-work-1", partNumber: "LINK-1" },
      { key: "fee-shop-supplies", unitPriceCents: 1875 },
    ]);
    expect(command.taxCents).toBe(595);
    expect(preservedKeys).toEqual(new Set(["work"]));
    expect(mocks.db.serviceDocument.create).not.toHaveBeenCalled();
  });
  it("reopens the exact saved lines and submits Labor Guide changes against that version", async () => {
    const revision = await getLaborGuideRevision(actor, "ro-1", source.id);
    expect(revision).toMatchObject({ estimateId: source.sourceId, documentId: source.id, expectedVersion: 4, lines: [{ key: "work", unitPriceCents: 25000 }] });
    await reviseServiceDocumentCharges(actor, "ro-1", {
      action: "LABOR_GUIDE_REVISION", documentId: source.id, estimateId: source.sourceId, documentHash: source.sha256,
      expectedVersion: 4, laborRate: 125, taxRatePercent: 7, revisionReason: "Adjust approved quote for additional scope",
      lineItems: [...revision.lines, { key: "part-new", type: "PART", description: "Sway bar link", quantity: 2, unitPriceCents: 2500, taxable: true, laborLineKey: "work" }],
    });
    const [,, command,, preservedKeys] = mocks.present.mock.calls[0];
    expect(command).toMatchObject({ chargeRevisionFrom: source.sourceId, documentReview: { documentId: source.id }, taxCents: 350, lineItems: [
      { key: "work", unitPriceCents: 25000 }, { key: "part-new", quantity: 2, laborLineKey: "work" }, { key: "fee-shop-supplies" },
    ] });
    expect(preservedKeys).toEqual(new Set(["work"]));
  });
  it("keeps posted invoice charges immutable but allows authorized contact corrections", async () => {
    mocks.db.serviceInvoice.findFirst.mockResolvedValue({ id: "invoice-1" });
    await expect(reviseServiceDocumentCharges(actor, "ro-1", { documentId: source.id, estimateId: "estimate-1" })).rejects.toThrow("issued invoice");
    expect(mocks.present).not.toHaveBeenCalled();
    const invoice = { ...source, kind: "INVOICE", sourceId: "invoice-1" };
    mocks.db.serviceDocument.findFirst.mockResolvedValue(invoice);
    await updateServiceDocumentCustomer(actor, "ro-1", { documentId: source.id, documentHash: source.sha256, customer, idempotencyKey: "invoice-contact" });
    expect(mocks.billing).toHaveBeenCalledWith(actor, "loc-1", true);
    expect(mocks.db.serviceDocument.create.mock.calls[0][0].data.kind).toBe("INVOICE");
  });
});
