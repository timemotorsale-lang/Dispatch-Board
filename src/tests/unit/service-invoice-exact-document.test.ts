import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ document: vi.fn(), candidate: vi.fn(), tx: {
  repairOrder: { findFirst: vi.fn() }, serviceInvoicePackage: { findFirst: vi.fn() },
  serviceInvoice: { findFirst: vi.fn(), create: vi.fn() }, serviceInvoiceSequence: { upsert: vi.fn() },
} }));
vi.mock("@/server/db/client", () => ({ prisma: mocks.tx }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: async () => [] }) }));
vi.mock("@/server/enterprise-command/vehicle-capabilities", () => ({ assertVehicleCapability: vi.fn() }));
vi.mock("@/server/enterprise-command/aggregate-mutation", () => ({ toJson: (value: unknown) => value, executeAggregateMutation: async (_db: unknown, _command: unknown, _topic: unknown, operation: (tx: unknown, version: number) => unknown) => operation(mocks.tx, 1) }));
vi.mock("@/server/service-close-parts/invoice-candidate", () => ({ assertCurrentInvoicePackage: mocks.candidate }));
vi.mock("@/server/repair-order/service-documents", () => ({ recordServiceDocument: mocks.document }));
import { executeServiceBilling } from "@/server/service-billing/service";
it("returns the exact posted invoice document rather than relying on a later latest-version lookup", async () => {
  mocks.tx.repairOrder.findFirst.mockResolvedValue({ locationId: "store", closedAt: null });
  mocks.tx.serviceInvoicePackage.findFirst.mockResolvedValue({ id: "package" });
  mocks.tx.serviceInvoice.findFirst.mockResolvedValue(null);
  mocks.tx.serviceInvoiceSequence.upsert.mockResolvedValue({ nextNumber: 2 });
  mocks.tx.serviceInvoice.create.mockResolvedValue({ id: "package", totalCents: 20000 });
  mocks.candidate.mockResolvedValue({ order: { origin: "CUSTOMER_REPAIR", customerId: "customer", closedAt: null }, identity: { repairOrderNumber: "RO-1" }, authorization: { id: "auth", decidedAt: new Date("2026-01-01") }, estimate: { id: "estimate" }, ledger: { lines: [], totalCents: 20000 }, fingerprint: "snapshot" });
  mocks.document.mockResolvedValue({ id: "immutable-invoice-document" });
  const actor = { id: "staff", name: "Staff", email: "staff@test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
  const result = await executeServiceBilling(actor, "repair", { action: "POST_INVOICE", packageId: "package", idempotencyKey: "posting", reason: "Verified final invoice", occurredAt: "2026-02-01T12:00:00Z" }, { organizationId: "org", enforceRollout: false });
  expect(result.result).toMatchObject({ id: "package", documentId: "immutable-invoice-document", version: 1 });
  expect(mocks.document).toHaveBeenCalledWith(mocks.tx, expect.objectContaining({ kind: "INVOICE", sourceId: "package", sourceVersion: 1 }));
});
