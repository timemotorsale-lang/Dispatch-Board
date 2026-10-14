import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { executeServiceClosePartsCommand } from "@/server/service-close-parts/service";
import type { ServiceClosePartsRepository } from "@/server/service-close-parts/repository";

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
