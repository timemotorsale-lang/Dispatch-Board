import { describe, expect, it } from "vitest";

import { buildPartsControlSnapshot } from "@/features/parts/parts-control-snapshot";
import type { getPartsOperationsWorkspace } from "@/server/parts-operations/service";

type Model = Awaited<ReturnType<typeof getPartsOperationsWorkspace>>;

const now = new Date("2026-07-20T14:00:00.000Z");

function model(): Model {
  return {
    contractVersion: "parts-operations/r8.0.0",
    generatedAt: now.toISOString(),
    capability: {
      barcodeHardware: "UNVERIFIED_MANUAL_FALLBACK",
      recommendations: "ADVISORY_NON_EXECUTING",
      vendorAdapters: "DISABLED"
    },
    ledger: {
      repairOrders: []
    },
    service: {
      custodyEvents: [],
      demands: [
        {
          id: "demand_1",
          partId: "part_pad",
          part: { description: "Front brake pads", partNumber: "PAD-100" },
          quantityRequired: 2,
          quantityReserved: 0,
          repairOrder: { locationId: "loc_1", repairOrderNumber: "RO-1001" },
          requiredAt: "2026-07-20T15:00:00.000Z",
          status: "OPEN"
        },
        {
          id: "demand_2",
          partId: "part_pad",
          part: { description: "Front brake pads", partNumber: "PAD-100" },
          quantityRequired: 2,
          quantityReserved: 0,
          repairOrder: { locationId: "loc_1", repairOrderNumber: "RO-1001" },
          requiredAt: "2026-07-20T15:30:00.000Z",
          status: "OPEN"
        }
      ],
      discrepancies: [
        {
          id: "disc_1",
          expectedQuantity: 2,
          receivedQuantity: 1,
          status: "OPEN",
          type: "SHORT"
        }
      ],
      locations: [],
      offers: [],
      purchaseOrders: [
        {
          id: "po_1",
          lines: [{ partId: "part_pad", quantity: 2, unitCostCents: 5000 }],
          location: { name: "Time Motor Sales" },
          orderedTotalCents: 10000,
          purchaseOrderNumber: "PO-1001",
          status: "ACKNOWLEDGED",
          vendor: { name: "NAPA" }
        }
      ],
      receipts: [
        {
          id: "receipt_1",
          lines: [{ partId: "part_pad", quantity: 1, unitCostCents: 5000 }],
          purchaseOrder: { purchaseOrderNumber: "PO-1001", requisition: { demand: { repairOrder: { repairOrderNumber: "RO-1001" } } } },
          stockLocation: { code: "RO-BIN", name: "RO Bin Shelf", type: "BIN" },
          receivedAt: "2026-07-20T13:00:00.000Z"
        }
      ],
      recoveries: [
        {
          id: "recovery_1",
          actualCreditCents: null,
          deadlineAt: "2026-07-20T12:00:00.000Z",
          expectedCreditCents: 5000,
          part: { partNumber: "PAD-100" },
          status: "ELIGIBLE",
          type: "RETURN",
          vendor: { name: "NAPA" }
        }
      ],
      requisitions: [],
      transfers: []
    },
    waveOne: {
      counts: [],
      discrepancies: [],
      parts: [],
      recommendations: [],
      reservations: [],
      stockLocations: []
    }
  } as unknown as Model;
}

function lateRiskModel(overrides: Partial<Model["service"]> = {}): Model {
  const base = model();
  return {
    ...base,
    service: {
      ...base.service,
      custodyEvents: [],
      demands: [{
        id: "demand_late",
        partId: "part_rotor",
        part: { description: "Front rotor", partNumber: "ROTOR-200" },
        quantityRequired: 1,
        quantityReserved: 0,
        repairOrder: { locationId: "loc_1", repairOrderNumber: "RO-2002" },
        requiredAt: "2026-07-21T14:00:00.000Z",
        status: "OPEN"
      }],
      discrepancies: [],
      offers: [],
      purchaseOrders: [],
      receipts: [],
      recoveries: [],
      requisitions: [],
      ...overrides
    }
  } as unknown as Model;
}

describe("buildPartsControlSnapshot", () => {
  it("surfaces duplicate, late, receiving, unknown-location, and recovery leakage", () => {
    const snapshot = buildPartsControlSnapshot(model(), now);

    expect(snapshot.counts.duplicateRisk).toBe(3);
    expect(snapshot.counts.lateOrderRisk).toBe(2);
    expect(snapshot.counts.unknownLocation).toBe(1);
    expect(snapshot.counts.recoveryRiskCents).toBe(5000);
    expect(snapshot.leakageQueues.receivingExceptions[0]?.action).toBe("Resolve receiving exception");
    expect(snapshot.actionQueue.map((item) => item.action)).toContain("Review possible duplicate demand");
    expect(snapshot.actionQueue.map((item) => item.action)).toContain("Review unverified received part");
    expect(snapshot.leakageQueues.unverifiedPartReview[0]?.meta).toContain("RO-1001 bin");
    expect(snapshot.actionQueue.map((item) => item.action)).toContain("Escalate overdue credit");
  });

  it("escalates vendor ETA when the best available offer arrives after the repair target", () => {
    const snapshot = buildPartsControlSnapshot(lateRiskModel({
      offers: [{
        estimatedArrivalAt: "2026-07-21T16:30:00.000Z",
        id: "offer_late",
        partId: "part_rotor",
        vendor: { name: "NAPA" }
      }]
    } as Partial<Model["service"]>), now);

    expect(snapshot.counts.lateOrderRisk).toBe(1);
    expect(snapshot.leakageQueues.lateOrderRisk[0]).toMatchObject({
      action: "Escalate vendor ETA past repair target",
      severity: "danger"
    });
    expect(snapshot.leakageQueues.lateOrderRisk[0]?.meta).toContain("NAPA ETA");
  });

  it("flags vendor cutoff review when urgent demand has no ETA recorded", () => {
    const snapshot = buildPartsControlSnapshot(lateRiskModel(), now);

    expect(snapshot.leakageQueues.lateOrderRisk[0]).toMatchObject({
      action: "Confirm vendor cutoff before ordering",
      severity: "warning"
    });
    expect(snapshot.leakageQueues.lateOrderRisk[0]?.meta).toContain("no vendor ETA recorded");
  });

  it("does not flag late-order risk when vendor ETA leaves enough operating buffer", () => {
    const snapshot = buildPartsControlSnapshot(lateRiskModel({
      offers: [{
        estimatedArrivalAt: "2026-07-21T10:00:00.000Z",
        id: "offer_safe",
        partId: "part_rotor",
        vendor: { name: "NAPA" }
      }]
    } as Partial<Model["service"]>), now);

    expect(snapshot.counts.lateOrderRisk).toBe(0);
  });
});
