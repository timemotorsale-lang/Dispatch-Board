import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PartsStaffHome } from "@/features/parts/parts-staff-home";
import type { getPartsOperationsWorkspace } from "@/server/parts-operations/service";

type Model = Awaited<ReturnType<typeof getPartsOperationsWorkspace>>;

const model = {
  contractVersion: "parts-operations/r8.0.0",
  generatedAt: "2026-07-20T14:00:00.000Z",
  capability: {
    barcodeHardware: "UNVERIFIED_MANUAL_FALLBACK",
    recommendations: "ADVISORY_NON_EXECUTING",
    vendorAdapters: "DISABLED"
  },
  ledger: {
    repairOrders: [{
      id: "ro_1",
      locationId: "loc_1",
      partDemands: [{ id: "demand_1", status: "PARTIALLY_RESERVED" }],
      readinessEvaluations: [{ evaluatedAt: "2026-07-20T14:00:00.000Z", ready: false }],
      repairOrderNumber: "RO-1001",
      vehicle: { make: "Ford", model: "F-150", vehicleNumber: "VEH-1001", year: 2024 }
    }]
  },
  service: {
    custodyEvents: [],
    demands: [{
      id: "demand_1",
      part: { description: "Front brake pads", partNumber: "PAD-100" },
      quantityRequired: 2,
      quantityReserved: 0,
      repairOrder: { locationId: "loc_1", repairOrderNumber: "RO-1001" },
      requiredAt: "2026-07-20T16:00:00.000Z",
      status: "REQUESTED"
    }],
    discrepancies: [],
    locations: [{ id: "loc_1", name: "Time Motor Sales — Minneapolis" }],
    offers: [{ estimatedArrivalAt: "2026-07-20T19:00:00.000Z", id: "offer_1", vendor: { name: "NAPA" } }],
    purchaseOrders: [],
    receipts: [],
    recoveries: [],
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

describe("PartsStaffHome", () => {
  it("renders a focused direct-to-work parts landing page", () => {
    const html = renderToStaticMarkup(<PartsStaffHome model={model} />);

    expect(html).toContain("Parts Workspace");
    expect(html).toContain("Stop parts leakage before it delays work.");
    expect(html).toContain("Duplicate risk");
    expect(html).toContain("Late-order risk");
    expect(html).toContain("Unverified Parts");
    expect(html).toContain("Unverified part review");
    expect(html).toContain("Returns &amp; credits recovery");
    expect(html).toContain("Parts action queue");
    expect(html).toContain("Source / reserve part");
    expect(html).toContain("PAD-100");
    expect(html).toContain("/vehicles/parts-operations?view=demand");
    expect(html).toContain("Parts rules");
  });
});
