import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ order: vi.fn(), package: vi.fn(), reconciliations: vi.fn(), invoice: vi.fn(), entry: vi.fn(), entries: vi.fn(), grants: vi.fn(), user: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { repairOrder: { findFirst: mocks.order }, serviceInvoicePackage: { findFirst: mocks.package }, serviceInvoiceReconciliation: { findMany: mocks.reconciliations }, serviceInvoice: { findFirst: mocks.invoice }, serviceInvoiceEntry: { findFirst: mocks.entry, findMany: mocks.entries } } }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants }) }));
vi.mock("@/server/auth/current-user", () => ({ requireCurrentUser: mocks.user }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
import { BillingRecordNotFoundError, getRepairBillingRecord, parseBillingRecordSelection } from "@/server/repair-order/billing-record";
import Page from "@/app/repair-billing-record/page";
import NotFound from "@/app/repair-billing-record/not-found";
const actor = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const organizationId = "org-time-motor-sales";
const query = { repairOrderId: "ro-1", packageId: "old-package" };
const date = new Date("2020-01-01T00:00:00Z");
const line = { description: "Stored brake repair", type: "LABOR", quantity: 1, unitPriceCents: 12345, totalCents: 12345 };
const ledger = { identity: { customer: "Original customer", vehicle: "Original vehicle", vin: "OLDVIN", store: "Original store" }, lines: [line], subtotalCents: 12345, discountCents: 0, taxCents: 99, totalCents: 12444 };
const invoice = { id: "invoice-1", invoiceNumber: "INV-OLD", currency: "USD", status: "POSTED", issuedAt: date, ledger, ...ledger, reason: "Original invoice reason" };
const entry = { id: "entry-1", invoiceId: "invoice-1", kind: "PAYMENT", amountCents: 12444, reference: "Original receipt", method: "CASH", occurredAt: date, evidence: { references: ["Verified cash log"] }, reason: "Original payment reason" };
beforeEach(() => {
  vi.resetAllMocks(); mocks.user.mockResolvedValue(actor); mocks.grants.mockResolvedValue([]);
  mocks.order.mockResolvedValue({ id: "ro-1", locationId: "store-1", repairOrderNumber: "RO-1" });
  mocks.package.mockResolvedValue({ id: "old-package", version: 1, status: "ACCEPTED", generatedAt: date, authorizedTotalCents: 12444, lineItems: [line], sourceSnapshot: { identity: ledger.identity, commercial: ledger, fingerprint: "SECRET_TECHNICAL_SNAPSHOT" }, reason: "Original preparation reason", externalSystemCode: "Legacy system", externalReference: "EXT-OLD" });
  mocks.reconciliations.mockResolvedValue([{ id: "recon-1", externalSystemCode: "Legacy system", externalReference: "EXT-OLD", status: "ACCEPTED", reconciledAt: date, returnedSubtotalCents: 12345, returnedTaxCents: 99, returnedTotalCents: 12444, expectedTotalCents: 12444, discrepancyCents: 0, reason: "Original reconciliation reason" }]);
  mocks.invoice.mockResolvedValue(invoice); mocks.entry.mockResolvedValue(entry); mocks.entries.mockResolvedValue([entry]);
});
const open = (params = query) => Page({ searchParams: Promise.resolve(params) });
describe("exact read-only legacy billing records", () => {
  it("retrieves the exact historical package and all scoped reconciliations", async () => {
    const result = await getRepairBillingRecord(actor, query);
    expect(result.kind).toBe("package"); expect(result.record).toMatchObject({ id: "old-package", version: 1 });
    expect(mocks.package).toHaveBeenCalledWith({ where: { id: "old-package", organizationId, repairOrderId: "ro-1" } });
    expect(mocks.reconciliations).toHaveBeenCalledWith({ where: { organizationId, invoicePackageId: "old-package" }, orderBy: [{ reconciledAt: "asc" }, { id: "asc" }] });
  });
  it.each([{}, { repairOrderId: "ro-1" }, { ...query, invoiceId: "invoice-1" }, { ...query, entryId: "entry-1" }, { ...query, packageId: ["a", "b"] }, { ...query, repairOrderId: ["a"] }, { ...query, packageId: "" }])("rejects ambiguous or missing selectors %j", params => {
    expect(() => parseBillingRecordSelection(params)).toThrow(BillingRecordNotFoundError);
  });
  it("requires authentication before querying records", async () => {
    await expect(getRepairBillingRecord(null, query)).rejects.toThrow("Authentication required");
    expect(mocks.order).not.toHaveBeenCalled();
  });
  it.each([null, "store-1"])("enforces RO deny at scope %s before billing reads", async locationId => {
    mocks.grants.mockResolvedValue([{ capability: "REPAIR_ORDER_VIEW", effect: "DENY", locationId, validFrom: new Date(0), validTo: null }]);
    await expect(getRepairBillingRecord(actor, query)).rejects.toThrow("REPAIR_ORDER_VIEW");
    expect(mocks.package).not.toHaveBeenCalled();
    if (locationId === null) expect(mocks.order).not.toHaveBeenCalled();
    await expect(open()).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("uses actual billing permission rules: RO role alone or another-store billing grant is insufficient", async () => {
    const advisor = { ...actor, roles: ["Service Advisor"] };
    await expect(getRepairBillingRecord(advisor, query)).rejects.toThrow("SERVICE_BILLING_VIEW");
    mocks.grants.mockResolvedValue([{ capability: "SERVICE_BILLING_VIEW", effect: "ALLOW", locationId: "other-store", validFrom: new Date(0), validTo: null }]);
    await expect(getRepairBillingRecord(advisor, query)).rejects.toThrow("SERVICE_BILLING_VIEW");
    expect(mocks.package).not.toHaveBeenCalled();
    mocks.user.mockResolvedValue(advisor); await expect(open()).rejects.toThrow("NEXT_NOT_FOUND");
    mocks.grants.mockResolvedValue([{ capability: "SERVICE_BILLING_VIEW", effect: "ALLOW", locationId: "store-1", validFrom: new Date(0), validTo: null }]);
    expect((await getRepairBillingRecord(advisor, query)).kind).toBe("package");
  });
  it("scopes native invoices and entries without substituting another record", async () => {
    await getRepairBillingRecord(actor, { repairOrderId: "ro-1", invoiceId: "invoice-1" });
    expect(mocks.invoice).toHaveBeenCalledWith({ where: { id: "invoice-1", organizationId, repairOrderId: "ro-1" } });
    expect(mocks.entries).toHaveBeenCalledWith({ where: { organizationId, invoiceId: "invoice-1" }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] });
    mocks.invoice.mockResolvedValue(null);
    await expect(getRepairBillingRecord(actor, { repairOrderId: "ro-1", entryId: "entry-1" })).rejects.toThrow(BillingRecordNotFoundError);
    expect(mocks.entry).toHaveBeenCalledWith({ where: { id: "entry-1", organizationId } });
  });
  it.each(["order", "package"] as const)("returns neutral missing fallback for absent %s", async key => {
    mocks[key].mockResolvedValue(null); await expect(open()).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it.each(["invoice", "entry"] as const)("returns unavailable for an absent exact %s", async key => {
    mocks[key].mockResolvedValue(null);
    await expect(Page({ searchParams: Promise.resolve({ repairOrderId: "ro-1", [key === "invoice" ? "invoiceId" : "entryId"]: "missing" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("renders stored credit allocation without recalculating it", async () => {
    mocks.entry.mockResolvedValue({ ...entry, kind: "CREDIT", amountCents: 50, relatedEntryId: "original", evidence: { components: { subtotalCents: 40, discountCents: 2, taxCents: 12 } } });
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ repairOrderId: "ro-1", entryId: "entry-1" }) }));
    for (const expected of ["Recorded credit allocation", "0.40", "0.02", "0.12", "0.50", "entryId=original"]) expect(html).toContain(expected);
  });
  it("propagates unexpected failures", async () => {
    mocks.package.mockRejectedValue(new Error("Database offline")); await expect(open()).rejects.toThrow("Database offline");
  });
  it("renders stored identity, lines, totals, reconciliation and reasons without technical snapshots or issued claims", async () => {
    const html = renderToStaticMarkup(await open());
    for (const expected of ["Invoice preparation record", "Original customer", "Stored brake repair", "123.45", "124.44", "EXT-OLD", "Original reconciliation reason", "Original preparation reason", "does not establish"]) expect(html).toContain(expected);
    for (const absent of ["<pre", "SECRET_TECHNICAL_SNAPSHOT", "<form", "<button", ".pdf", "fingerprint"]) expect(html).not.toContain(absent);
  });
  it("tolerates missing legacy snapshot fields without using current identity or inventing amounts", async () => {
    const record = await mocks.package(); mocks.package.mockResolvedValue({ ...record, sourceSnapshot: null, lineItems: [{ description: "Legacy item" }] });
    const html = renderToStaticMarkup(await open()); expect(html).toContain("Legacy item"); expect(html).toContain("Not recorded"); expect(html).not.toContain("Original customer");
  });
  it("renders exact invoice and entry links and differentiates evidence from an issued receipt", async () => {
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ repairOrderId: "ro-1", invoiceId: "invoice-1" }) }));
    expect(html).toContain("Issued service invoice record"); expect(html).toContain("entryId=entry-1"); expect(html).toContain("124.44");
    const payment = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ repairOrderId: "ro-1", entryId: "entry-1" }) }));
    expect(payment).toContain("not an issued receipt"); expect(payment).toContain("invoiceId=invoice-1"); expect(payment).toContain("Verified cash log"); expect(payment).toContain("Original payment reason");
  });
  it("keeps the unavailable message free of record and permission details", () => {
    const html = renderToStaticMarkup(<NotFound />); expect(html).toContain("Billing record unavailable"); expect(html).not.toMatch(/store-1|SERVICE_BILLING|old-package/);
  });
});
