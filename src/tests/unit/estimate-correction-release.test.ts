import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { POST } from "@/app/api/repair-orders/[id]/document-review/route";
const mocks = vi.hoisted(() => ({
  db: {
    repairOrder: { findFirst: vi.fn() },
    serviceDocument: { findFirst: vi.fn(), create: vi.fn() },
    enterpriseCommandLedger: { findUnique: vi.fn(), create: vi.fn() },
    enterpriseAuditEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  currentUser: vi.fn(),
  grants: vi.fn(),
  flags: vi.fn(),
}));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/server/db/client", () => ({ prisma: mocks.db }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants, listFeatureFlags: mocks.flags }) }));
vi.mock("@/server/service-billing/service", () => ({ billingAccess: vi.fn() }));
vi.mock("@/server/services/labor-rate-settings", () => ({ getActiveLaborRate: vi.fn().mockResolvedValue({ laborRate: 125 }) }));
vi.mock("@/server/shop-planning/service", () => ({ presentRepairEstimate: vi.fn() }));
const actor = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const identity = { customer: "Customer", vehicle: "Vehicle", vin: "VIN", vehicleNumber: "VEH-1", concern: "Repair", repairOrderNumber: "RO-1", store: "Time Motor Sales", address: "Store", timezone: "America/Chicago" };
const content = { title: "Estimate", number: "RO-1 / v1", issuedAt: "2026-10-29T12:00:00Z", identity, lines: [{ key: "work", type: "LABOR", description: "Repair", quantity: 1, unitPriceCents: 25000, totalCents: 25000 }], totals: { subtotalCents: 25000, discountCents: 0, taxCents: 0, totalCents: 25000 }, notes: [] };
const source = { id: "doc-1", organizationId: "org-time-motor-sales", repairOrderId: "ro-1", kind: "ESTIMATE", sourceId: "estimate-1", sourceVersion: 1, templateVersion: "service-document-v2", content, sha256: hashEnterpriseCommand({ templateVersion: "service-document-v2", content }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue(actor);
  mocks.grants.mockResolvedValue([]);
  mocks.flags.mockResolvedValue([{ code: "VEHICLE_OPERATIONS_MASTER", mode: "GENERAL", locationId: null }, { code: "SHOP_OPERATIONS", mode: "GENERAL", locationId: "loc-1" }]);
  mocks.db.repairOrder.findFirst.mockResolvedValue({ id: "ro-1", locationId: "loc-1", version: 4, closedAt: new Date("2026-10-30T12:00:00Z") });
  mocks.db.serviceDocument.findFirst.mockResolvedValue(source);
  mocks.db.serviceDocument.create.mockImplementation(async ({ data }) => ({ id: "doc-2", ...data }));
  mocks.db.enterpriseCommandLedger.findUnique.mockResolvedValue(null);
  mocks.db.enterpriseCommandLedger.create.mockResolvedValue({ id: "ledger-1" });
  mocks.db.enterpriseAuditEvent.create.mockResolvedValue({});
  mocks.db.$transaction.mockImplementation(async callback => callback(mocks.db));
});

const correction = {
  action: "ESTIMATE_DETAILS",
  documentId: source.id,
  documentHash: source.sha256,
  idempotencyKey: "historical-estimate-correction",
  estimateDate: "2019-03-08",
  serviceDate: "2019-03-07",
  validThrough: "2019-03-22",
  mileage: 124507,
  unit: "KILOMETERS",
  memo: "  Claim   reference 42  ",
  reason: "Transcribe the original signed estimate.",
};

function submit(overrides = {}) {
  return POST(new Request("http://local/api/repair-orders/ro-1/document-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...correction, ...overrides }),
  }), { params: Promise.resolve({ id: "ro-1" }) });
}

describe("estimate correction release", () => {
  it("appends a hashed historical correction and audits both versions on a closed order", async () => {
    const originalDocument = structuredClone(source);
    const response = await submit();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ documentId: "doc-2" });

    const saved = mocks.db.serviceDocument.create.mock.calls[0][0].data;
    expect(saved).toMatchObject({
      kind: "ESTIMATE",
      sourceId: source.sourceId,
      sourceVersion: 2,
      createdByUserId: actor.id,
    });
    expect(saved.content).toEqual({
      ...originalDocument.content,
      revisionLabel: "Estimate details corrected",
      estimateDetails: {
        estimateDate: "2019-03-08",
        serviceDate: "2019-03-07",
        validThrough: "2019-03-22",
        mileage: { reading: 124507, unit: "KILOMETERS" },
        memo: "Claim reference 42",
        reason: correction.reason,
        previousDocumentId: source.id,
      },
    });
    expect(saved.sha256).toBe(hashEnterpriseCommand({ templateVersion: saved.templateVersion, content: saved.content }));
    expect(source).toEqual(originalDocument);
    expect(mocks.db.enterpriseCommandLedger.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      commandType: "CORRECT_ESTIMATE_DETAILS",
      expectedVersion: 1,
      resultingVersion: 2,
      resultSnapshot: { documentId: "doc-2" },
    }) });
    expect(mocks.db.enterpriseAuditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      eventType: "ESTIMATE_DETAILS_CORRECTED",
      commandId: "ledger-1",
      reason: correction.reason,
      priorValue: { documentId: source.id, sha256: source.sha256 },
      newValue: { documentId: "doc-2", sha256: saved.sha256 },
      metadata: { financialAmountsChanged: false },
    }) });
  });

  it("denies a user without repair-order manage permission before any write", async () => {
    mocks.currentUser.mockResolvedValue({ ...actor, roles: [] });
    const response = await submit();
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("REPAIR_ORDER_MANAGE");
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.db.serviceDocument.create).not.toHaveBeenCalled();
  });

  it("recovers a committed correction after an uncertain response and rejects altered or stale retries", async () => {
    const connectionLost = new Error("Connection lost after commit");
    connectionLost.name = "PrismaClientUnknownRequestError";
    mocks.db.$transaction.mockImplementationOnce(async callback => {
      await callback(mocks.db);
      throw connectionLost;
    });
    const first = await submit();
    expect(first.status).toBe(503);
    expect((await first.json()).error).toContain("Retry the unchanged request");

    const { requestHash, resultSnapshot } = mocks.db.enterpriseCommandLedger.create.mock.calls[0][0].data;
    const latest = { id: "doc-2", ...mocks.db.serviceDocument.create.mock.calls[0][0].data };
    mocks.db.serviceDocument.findFirst.mockImplementation(async ({ where }) => where.id ? source : latest);
    mocks.db.enterpriseCommandLedger.findUnique.mockImplementation(async ({ where }) =>
      where.organizationId_domain_commandType_idempotencyKey.idempotencyKey === correction.idempotencyKey
        ? { requestHash, resultSnapshot }
        : null
    );

    const retry = await submit();
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ documentId: "doc-2" });
    const changed = await submit({ memo: "Different claim reference" });
    expect(changed.status).toBe(409);
    expect((await changed.json()).error).toContain("different document details");
    const stale = await submit({ idempotencyKey: "new-key-for-old-document" });
    expect(stale.status).toBe(409);
    expect((await stale.json()).error).toContain("latest version");
    expect(mocks.db.serviceDocument.create).toHaveBeenCalledTimes(1);
    expect(mocks.db.enterpriseCommandLedger.create).toHaveBeenCalledTimes(1);
    expect(mocks.db.enterpriseAuditEvent.create).toHaveBeenCalledTimes(1);
  });
});
