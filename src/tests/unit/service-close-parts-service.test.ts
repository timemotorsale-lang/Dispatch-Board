import { receiptLineConsumedQuantities } from "@/server/service-close-parts/domain";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { executeServiceClosePartsCommand } from "@/server/service-close-parts/service";
import type { PrismaClient } from "@prisma/client";
import { createServiceClosePartsRepository, type ServiceClosePartsRepository } from "@/server/service-close-parts/repository";

vi.mock("@/server/inventory-lifecycle/acquisition", () => ({
  recordAcquisitionAppraisal: vi.fn().mockResolvedValue({ id: "appraisal-2", version: 2 }),
}));

const manager: AuthenticatedUser = {
  duties: { all: [], direct: [], roleDefaults: [] },
  email: "manager@example.com",
  id: "manager-1",
  isActive: true,
  name: "Manager",
  roles: ["General Manager"],
};

function foundation(): EnterpriseCommandRepository {
  return {
    async claimReadyOutbox() { return []; },
    async commit() { throw new Error("unused"); },
    async listCapabilityGrants() { return []; },
    async listFeatureFlags() { return []; },
    async markOutboxFailed() {},
    async markOutboxPublished() {},
    async readHealth() { return { commands24h: 0, deadLetters: 0, failedCommands24h: 0, maxProjectionLagSeconds: 0, oldestPendingAt: null, pendingOutbox: 0, projectionFailures: 0 }; },
    async updateFeatureFlag() { throw new Error("unused"); },
  };
}

describe("service close parts service", () => {
  it("allows only managers to change the purchasing restriction", async () => {
    const setPurchaseApprovalPolicy = vi.fn().mockResolvedValue({ result: { purchaseApprovalRequired: true } });
    const repository = { aggregateVersion: vi.fn().mockResolvedValue(0), setPurchaseApprovalPolicy } as unknown as ServiceClosePartsRepository;
    const input = { repository, foundationRepository: foundation(), enforceRollout: false };
    const change = { action: "SET_PURCHASE_APPROVAL_POLICY", required: true, idempotencyKey: "purchase-policy-test" };
    await expect(executeServiceClosePartsCommand({ ...manager, roles: ["Parts"] }, change, input)).rejects.toThrow("Only a manager");
    expect(setPurchaseApprovalPolicy).not.toHaveBeenCalled();
    await executeServiceClosePartsCommand(manager, change, input);
    expect(setPurchaseApprovalPolicy).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: manager.id }), true);
  });
  it("rejects a recon exception for customer work even with an inventory link", async () => {
    const repository = { overview: vi.fn().mockResolvedValue({ repairOrders: [{
      id: "ro-customer", origin: "CUSTOMER_REPAIR", inventoryUnit: { id: "inventory-1" },
    }] }) } as unknown as ServiceClosePartsRepository;
    await expect(executeServiceClosePartsCommand(manager, {
      action: "APPROVE_RECON_BUDGET_EXCEPTION", subjectId: "ro-customer",
      increaseByCents: 3500, reason: "Additional parts",
    }, { enforceRollout: false, foundationRepository: foundation(), repository }))
      .rejects.toThrow("only to internal inventory repairs");
  });

  it("uses the recorded recon allowance rather than a client-submitted ceiling", async () => {
    const { recordAcquisitionAppraisal } = await import("@/server/inventory-lifecycle/acquisition");
    const repository = { overview: vi.fn().mockResolvedValue({ repairOrders: [{
      id: "ro-recon", origin: "INVENTORY_RECON", repairOrderNumber: "RO-RECON",
      inventoryUnit: { id: "inventory-1", acquisitionAppraisals: [{ estimatedReconCents: 10000 }] },
    }] }) } as unknown as ServiceClosePartsRepository;
    await executeServiceClosePartsCommand(manager, {
      action: "APPROVE_RECON_BUDGET_EXCEPTION", subjectId: "ro-recon",
      currentMaxReconBudgetCents: 99999999, increaseByCents: 3500, reason: "Additional parts",
    }, { enforceRollout: false, foundationRepository: foundation(), repository });
    expect(recordAcquisitionAppraisal).toHaveBeenLastCalledWith(manager, "inventory-1",
      expect.objectContaining({ estimatedReconCents: 13500 }));
  });

  const overview = {
    custodyEvents: [],
    demands: [],
    discrepancies: [],
    interchanges: [],
    locations: [],
    offers: [],
    parts: [],
    purchaseOrders: [{ id: "po-1", locationId: "loc-1", status: "ACKNOWLEDGED" }],
    receipts: [],
    recoveries: [],
    repairOrders: [],
    requisitions: [],
    stockLocations: [],
    transfers: [],
    vendors: [],
  };

  it("creates a fresh receipt id while keeping purchase-order aggregate versioning", async () => {
    const receivePurchaseOrder = vi.fn().mockResolvedValue({ result: { id: "receipt-1" } });
    const repository = {
      aggregateVersion: vi.fn().mockResolvedValue(3),
      overview: vi.fn().mockResolvedValue(overview),
      receivePurchaseOrder,
    } as unknown as ServiceClosePartsRepository;

    const input = {
      action: "RECEIVE_PURCHASE_ORDER",
      invoiceReference: null,
      lines: [{ damagedQuantity: 0, partId: "part-1", quantity: 1, unitCostCents: 100 }],
      packingSource: "NOTE-1",
      reason: "Received parts note.",
      receivedAt: "2026-08-27T10:00:00.000Z",
      stockLocationId: "stock-1",
      subjectId: "po-1",
    };

    await executeServiceClosePartsCommand(manager, { ...input, idempotencyKey: "receive-1" }, { enforceRollout: false, foundationRepository: foundation(), repository });
    await executeServiceClosePartsCommand(manager, { ...input, idempotencyKey: "receive-2", packingSource: "NOTE-2" }, { enforceRollout: false, foundationRepository: foundation(), repository });

    expect(receivePurchaseOrder).toHaveBeenCalledTimes(2);
    expect(receivePurchaseOrder.mock.calls[0][0]).toMatchObject({ expectedVersion: 3, subjectId: "po-1", subjectType: "PART_PURCHASE_ORDER" });
    expect(receivePurchaseOrder.mock.calls[0][1]).toBe("po-1");
    expect(receivePurchaseOrder.mock.calls[0][2].receiptId).not.toBe("po-1");
    expect(receivePurchaseOrder.mock.calls[1][2].receiptId).not.toBe("po-1");
    expect(receivePurchaseOrder.mock.calls[1][2].receiptId).not.toBe(receivePurchaseOrder.mock.calls[0][2].receiptId);
  });

  const receiptRequest = {
    action: "RECEIVE_PURCHASE_ORDER", subjectId: "po-1", idempotencyKey: "same-receipt",
    invoiceReference: null, packingSource: "NOTE-1", receivedAt: "2026-08-27T10:00:00.000Z",
    stockLocationId: "stock-1", reason: "Received parts note.",
    lines: [{ damagedQuantity: 0, partId: "part-1", quantity: 1, unitCostCents: 100 }],
  };

  it("preserves the original zero version and request hash when retrying a completed receipt", async () => {
    const commandReceipt = vi.fn().mockResolvedValueOnce(null).mockResolvedValue({ expectedVersion: 0 });
    const aggregateVersion = vi.fn().mockResolvedValueOnce(0).mockResolvedValue(1);
    const receivePurchaseOrder = vi.fn().mockResolvedValue({ result: { id: "receipt-1" } });
    const repository = {
      commandReceipt, aggregateVersion, receivePurchaseOrder,
      overview: vi.fn().mockResolvedValueOnce(overview).mockResolvedValue({ ...overview, purchaseOrders: [{ id: "po-1", locationId: "loc-1", status: "RECEIVED" }] }),
    } as unknown as ServiceClosePartsRepository;
    const dependencies = { organizationId: "org-test", enforceRollout: false, foundationRepository: foundation(), repository };
    await executeServiceClosePartsCommand(manager, receiptRequest, dependencies);
    await executeServiceClosePartsCommand(manager, receiptRequest, dependencies);
    expect(commandReceipt).toHaveBeenNthCalledWith(2, "org-test", "RECEIVE_PURCHASE_ORDER", "same-receipt", "PARTS_OPERATIONS");
    expect(aggregateVersion).toHaveBeenCalledTimes(1);
    expect(receivePurchaseOrder).toHaveBeenCalledTimes(2);
    const first = receivePurchaseOrder.mock.calls[0][0];
    const retry = receivePurchaseOrder.mock.calls[1][0];
    expect(first.expectedVersion).toBe(0);
    expect(retry.expectedVersion).toBe(0);
    expect(retry.requestHash).toBe(first.requestHash);
    expect(retry).toMatchObject({ actorUserId: manager.id, locationId: "loc-1", subjectId: "po-1" });
  });

  it("does not substitute saved receipt data for a changed-payload retry", async () => {
    const receivePurchaseOrder = vi.fn().mockResolvedValue({ result: { id: "receipt-1" } });
    const repository = {
      overview: vi.fn().mockResolvedValue(overview),
      commandReceipt: vi.fn().mockResolvedValue({ expectedVersion: 0 }),
      receivePurchaseOrder,
    } as unknown as ServiceClosePartsRepository;
    const dependencies = { enforceRollout: false, foundationRepository: foundation(), repository };
    await executeServiceClosePartsCommand(manager, receiptRequest, dependencies);
    await executeServiceClosePartsCommand(manager, { ...receiptRequest, packingSource: "CHANGED" }, dependencies);
    expect(receivePurchaseOrder.mock.calls[1][0].requestHash).not.toBe(receivePurchaseOrder.mock.calls[0][0].requestHash);
    expect(receivePurchaseOrder.mock.calls[1][2].packingSource).toBe("CHANGED");
  });

  it.each(["restricted-role", "store-deny", "rollout-disabled"])("does not look up or replay an existing receipt after %s authorization fails", async scenario => {
    const commandReceipt = vi.fn().mockResolvedValue({ expectedVersion: 0 });
    const receivePurchaseOrder = vi.fn();
    const aggregateVersion = vi.fn();
    const repository = { overview: vi.fn().mockResolvedValue(overview), commandReceipt, receivePurchaseOrder, aggregateVersion } as unknown as ServiceClosePartsRepository;
    const access = foundation();
    if (scenario === "store-deny") {
      access.listCapabilityGrants = vi.fn().mockResolvedValue([{ capability: "PARTS_MANAGE", effect: "DENY", locationId: "loc-1", validFrom: new Date(0), validTo: null }]);
    }
    const actor = scenario === "restricted-role" ? { ...manager, roles: ["Mechanic"] } : manager;
    await expect(executeServiceClosePartsCommand(actor, receiptRequest, {
      repository, foundationRepository: access, enforceRollout: scenario === "rollout-disabled",
    })).rejects.toThrow(scenario === "rollout-disabled" ? "mutations are not enabled" : "PARTS_MANAGE");
    expect(commandReceipt).not.toHaveBeenCalled();
    expect(aggregateVersion).not.toHaveBeenCalled();
    expect(receivePurchaseOrder).not.toHaveBeenCalled();
  });

  it("allows a partially received purchase order correction to reach the repository", async () => {
    const revisePurchaseOrder = vi.fn().mockResolvedValue({ result: { id: "po-1", status: "PARTIALLY_RECEIVED" } });
    const repository = {
      aggregateVersion: vi.fn().mockResolvedValue(5),
      overview: vi.fn().mockResolvedValue({
        ...overview,
        purchaseOrders: [{ id: "po-1", locationId: "loc-1", status: "PARTIALLY_RECEIVED" }],
      }),
      revisePurchaseOrder,
    } as unknown as ServiceClosePartsRepository;

    await executeServiceClosePartsCommand(manager, {
      action: "REVISE_PURCHASE_ORDER",
      idempotencyKey: "revise-partial-1",
      lines: [{ partId: "part-1", quantity: 1, unitCostCents: 12500 }],
      reason: "Correct a partially received PO line.",
      subjectId: "po-1",
    }, { enforceRollout: false, foundationRepository: foundation(), repository });

    expect(revisePurchaseOrder).toHaveBeenCalledWith(
      expect.objectContaining({ expectedVersion: 5, subjectId: "po-1", subjectType: "PART_PURCHASE_ORDER" }),
      "po-1",
      expect.objectContaining({ lines: [{ partId: "part-1", quantity: 1, unitCostCents: 12500 }] }),
    );
  });
});

describe("durable procurement replay", () => {
  function setup() {
    const ledger = new Map<string, Record<string, unknown>>();
    const vendor = vi.fn(async ({ data }) => ({ ...data, status: "ACTIVE" }));
    const partReceipt = vi.fn();
    const receiptFind = vi.fn().mockResolvedValue({
      id: "receipt-1", purchaseOrder: { locationId: "site-1", vendorId: "vendor-1" },
      stockLocationId: "bin-1", receivedAt: new Date("2026-11-15T00:00:00Z"),
      lines: [{ partId: "part-1", quantity: 3, damagedQuantity: 0, unitCostCents: 100 }],
    });
    const custody = vi.fn(async ({ data }) => data);
    const recovery = vi.fn(async ({ data }) => ({ ...data, status: "ELIGIBLE" }));
    const stockMovement = vi.fn();
    const legacyCustody = vi.fn().mockResolvedValue(null);
    const priorReturns = vi.fn().mockResolvedValue({ _sum: { quantity: 0 } });
    const authorization = vi.fn().mockResolvedValue({ id: "auth-1", disposition: "ACCEPTED", authorizedLineKeys: ["line-1"] });
    const stockUpdate = vi.fn().mockResolvedValue({});
    const orderUpdate = vi.fn(async ({ data }) => ({ ...data, id: "req-1" }));
    let version = 0;
    const tx = {
      enterpriseCommandLedger: {
        findUnique: vi.fn(async ({ where }) => ledger.get(where.organizationId_domain_commandType_idempotencyKey.idempotencyKey)),
        create: vi.fn(async ({ data }) => {
          ledger.set(data.idempotencyKey, data);
          return { ...data, id: "command-1" };
        }),
      },
      enterpriseAggregateVersion: {
        findUnique: vi.fn(async () => version ? { id: "version-1", version } : null),
        create: vi.fn(async ({ data }) => { version = data.version; }),
        update: vi.fn(async ({ data }) => { version = data.version; }),
      },
      enterpriseDomainEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
      enterpriseAuditEvent: { create: vi.fn() },
      enterpriseOutboxMessage: { create: vi.fn() },
      partVendor: { findFirst: vi.fn().mockResolvedValue(null), create: vendor },
      partRequisition: { findFirst: vi.fn().mockResolvedValue({ id: "req-1", status: "SOURCING", demand: { partId: "part-1", repairOrder: { id: "ro-1", locationId: "site-1" } } }), update: orderUpdate },
      partVendorOffer: { findFirst: vi.fn().mockResolvedValue({ id: "offer-1" }) },
      partPurchaseOrder: { findFirst: vi.fn().mockResolvedValue({ id: "po-1", locationId: "site-1", status: "PARTIALLY_RECEIVED", lines: [{ partId: "part-1", quantity: 3 }], receipts: [{ lines: [{ partId: "part-1", quantity: 2 }] }] }) },
      partStockLocation: { findFirst: vi.fn().mockResolvedValue({ id: "bin-1" }) },
      partReceipt: { create: partReceipt, findFirst: receiptFind },
      partCustodyEvent: { findFirst: legacyCustody, aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 0 } }), create: custody },
      partRecoveryCase: { aggregate: priorReturns, create: recovery },
      partStockBalance: { findUnique: vi.fn().mockResolvedValue({ onHandQuantity: 3, allocatedQuantity: 0, averageCostCents: 100 }), upsert: stockUpdate },
      partStockLedgerEntry: { create: stockMovement },
      partCycleCount: { findFirst: vi.fn().mockResolvedValue(null) },
      part: { findFirst: vi.fn().mockResolvedValue({ id: "part-1" }) },
      repairJob: { findFirst: vi.fn().mockResolvedValue({ id: "job-1", estimateVersionId: "estimate-1", authorizationId: "auth-1", authorizedLineKey: "line-1" }) },
      repairAuthorization: { findFirst: authorization },
      repairEstimateVersion: { findFirst: vi.fn().mockResolvedValue({ id: "estimate-1" }) },
      vehicleOperationsFeatureFlag: { findFirst: vi.fn().mockResolvedValue(null) },
      organization: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const database = { ...tx, $transaction: vi.fn(async callback => callback(tx)) } as unknown as PrismaClient;
    const repository = createServiceClosePartsRepository(database);
    vi.spyOn(repository, "overview").mockResolvedValue({ purchaseOrders: [{ id: "po-1", locationId: "site-1" }], repairOrders: [] } as unknown as Awaited<ReturnType<typeof repository.overview>>);
    const foundationRepository = foundation();
    const flags = vi.spyOn(foundationRepository, "listFeatureFlags").mockResolvedValue(
      ["VEHICLE_OPERATIONS_MASTER", "PARTS_OPERATIONS"].map(code => ({
        code, id: code, mode: "GENERAL", locationId: "site-1", organizationId: "org-1",
        allowedUserIds: [], rolloutPercent: 0, targetAt: null, updatedAt: new Date(0), version: 1,
      }))
    );
    const options = { repository, foundationRepository, enforceRollout: false };
    return { vendor, orderUpdate, partReceipt, receiptFind, custody, recovery, stockMovement, stockUpdate, legacyCustody, priorReturns, authorization, flags, run: (body: Record<string, unknown>) => executeServiceClosePartsCommand(manager, body, options) };
  }

  const outcome = {
    action: "RECORD_RECEIVED_PART_OUTCOME", repairOrderId: "ro-1", receiptId: "receipt-1",
    lineIndex: 0, quantity: 1, occurredAt: "2026-11-15T01:00:00Z", idempotencyKey: "outcome-1",
  };
  const installed = { ...outcome, outcome: "USED", repairJobId: "job-1", evidence: ["Technician verified installation."] };
  const returned = { ...outcome, outcome: "RETURN", returnReason: "Unused part ready for vendor review.", deadlineAt: "2026-11-20T01:00:00Z" };

  it("debits once and records attributable installation on replay", async () => {
    const { run, stockMovement, custody } = setup();
    await expect(run(installed)).resolves.toMatchObject({ result: { status: "INSTALLED", remainingQuantity: 2 } });
    await expect(run(installed)).resolves.toMatchObject({ duplicate: true, result: { status: "INSTALLED" } });
    expect(stockMovement).toHaveBeenCalledTimes(1);
    expect(stockMovement).toHaveBeenCalledWith({ data: expect.objectContaining({ movementType: "INSTALL", quantityDelta: -1, sourceType: "PART_RECEIPT_LINE", sourceId: expect.stringMatching(/^receipt-1:0:/) }) });
    expect(custody).toHaveBeenCalledTimes(1);
    expect(custody).toHaveBeenCalledWith({ data: expect.objectContaining({ repairJobId: "job-1", evidence: installed.evidence }) });
  });

  it("opens the return case without posting stock, shipment, or credit", async () => {
    const { run, recovery, stockMovement, stockUpdate, custody } = setup();
    await expect(run(returned)).resolves.toMatchObject({ result: { status: "ELIGIBLE", remainingQuantity: 2 } });
    await expect(run(returned)).resolves.toMatchObject({ duplicate: true });
    expect(recovery).toHaveBeenCalledTimes(1);
    expect(recovery).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "VENDOR_RETURN", vendorId: "vendor-1", expectedCreditCents: 0, sourceReference: expect.stringMatching(/^RO:ro-1\|RECEIPT:receipt-1:0\|/) }) });
    expect(stockMovement).not.toHaveBeenCalled();
    expect(stockUpdate).not.toHaveBeenCalled();
    expect(custody).not.toHaveBeenCalled();
  });

  it("blocks both outcomes for an ambiguous legacy issue or installation on the receipt line", async () => {
    const { run, legacyCustody, stockMovement, recovery } = setup();
    legacyCustody.mockResolvedValue({ id: "legacy-install" });
    await expect(run(installed)).rejects.toThrow("legacy custody records");
    await expect(run(returned)).rejects.toThrow("legacy custody records");
    expect(legacyCustody).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ sourceType: "PART_CUSTODY", sourceId: "receipt-1:0", type: { in: ["INSTALL", "ISSUE"] } }),
    }));
    expect(stockMovement).not.toHaveBeenCalled();
    expect(recovery).not.toHaveBeenCalled();
  });

  it("blocks both outcomes on a damaged receipt line", async () => {
    const { run, receiptFind, stockMovement, recovery } = setup();
    const receipt = await receiptFind();
    receiptFind.mockResolvedValue({ ...receipt, lines: [{ partId: "part-1", quantity: 3, damagedQuantity: 1, unitCostCents: 100 }] });
    await expect(run(installed)).rejects.toThrow("undamaged receipt line");
    await expect(run(returned)).rejects.toThrow("undamaged receipt line");
    expect(stockMovement).not.toHaveBeenCalled();
    expect(recovery).not.toHaveBeenCalled();
  });

  it("blocks stock use when the receipt quantity is already committed to returns", async () => {
    const { run, priorReturns, stockMovement } = setup();
    priorReturns.mockResolvedValue({ _sum: { quantity: 3 } });
    await expect(run(installed)).rejects.toThrow("remaining undisposed units");
    expect(priorReturns).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      OR: expect.arrayContaining([{ sourceReference: { startsWith: "RO:ro-1|RECEIPT:receipt-1:0|" } }]),
    }) }));
    expect(stockMovement).not.toHaveBeenCalled();
  });

  it("blocks installation when the current authorization does not cover the job", async () => {
    const { run, authorization, stockMovement } = setup();
    authorization.mockResolvedValue({ id: "auth-2", disposition: "DECLINED", authorizedLineKeys: [] });
    await expect(run(installed)).rejects.toThrow("authorization was revoked");
    expect(stockMovement).not.toHaveBeenCalled();
  });

  it("requires the exact receipt linkage and effective site rollout", async () => {
    const { run, receiptFind, flags, recovery } = setup();
    receiptFind.mockResolvedValueOnce(null);
    await expect(run(returned)).rejects.toThrow("Receipt does not belong");
    flags.mockResolvedValue([]);
    await expect(run(returned)).rejects.toThrow("Parts Operations mutations are not enabled");
    expect(recovery).not.toHaveBeenCalled();
  });

  it("recovers a committed vendor response and rejects a changed payload", async () => {
    const { vendor, run } = setup();
    const body = { action: "CREATE_VENDOR", idempotencyKey: "vendor-lost-response", name: "Test Vendor", code: "TEST", reason: "Record a legitimate vendor.", defaultReturnTerms: "Confirm terms with vendor", defaultWarranty: "Confirm warranty with vendor", paymentTerms: "Due on receipt" };
    const first = await run(body);
    await expect(run(body)).resolves.toMatchObject({ duplicate: true, result: "result" in first ? first.result : undefined });
    await expect(run({ ...body, name: "Different Vendor" })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    expect(vendor).toHaveBeenCalledTimes(1);
  });

  it("rejects a purchase location that differs from the requisition repair order", async () => {
    const { run } = setup();
    await expect(run({
      action: "CREATE_PURCHASE_ORDER", idempotencyKey: "wrong-site", vendorId: "vendor-1",
      requisitionId: "req-1", locationId: "site-2", purchaseOrderNumber: "PO-1",
      lines: [{ partId: "part-1", quantity: 1, unitCostCents: 100 }], reason: "Record an existing purchase."
    })).rejects.toThrow("must match the requisition repair order location");
  });

  it("rejects a strict receipt above the remaining quantity before writing stock or a receipt", async () => {
    const { partReceipt, run } = setup();
    await expect(run({
      action: "RECEIVE_PURCHASE_ORDER", idempotencyKey: "strict-receipt", subjectId: "po-1", strictRemaining: true,
      stockLocationId: "bin-1", packingSource: "Packing slip 1", receivedAt: "2026-11-15T01:00:00Z",
      lines: [{ partId: "part-1", quantity: 2, unitCostCents: 100 }], reason: "Receive the vendor delivery."
    })).rejects.toThrow("remaining quantity");
    expect(partReceipt).not.toHaveBeenCalled();
  });

  it("recovers offer selection after its aggregate advances", async () => {
    const { orderUpdate, run } = setup();
    const body = { action: "SELECT_REQUISITION_OFFER", subjectId: "req-1", offerId: "offer-1", idempotencyKey: "selection-lost-response", reason: "Select verified supplier offer." };
    const first = await run(body);
    await expect(run(body)).resolves.toMatchObject({ duplicate: true, result: "result" in first ? first.result : undefined });
    expect(orderUpdate).toHaveBeenCalledTimes(1);
  });
});


it("counts legacy and partial receipt custody without conflating line indexes", () => {
  const quantities = receiptLineConsumedQuantities([
    { sourceId: "receipt:0", quantity: 1 },
    { sourceId: "receipt:0", quantity: 1 },
    { sourceId: "receipt:0:install-a", quantity: 2 },
    { sourceId: "receipt:10:install-b", quantity: 4 },
  ]);
  expect(quantities.get("receipt:0")).toBe(3);
  expect(quantities.get("receipt:10")).toBe(4);
});
