import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PartsReceivingWorkspace } from "@/features/parts/parts-receiving-workspace";
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
  ledger: { repairOrders: [] },
  service: {
    custodyEvents: [],
    demands: [],
    discrepancies: [],
    locations: [{ id: "loc_1", name: "Time Motor Sales" }],
    offers: [],
    purchaseOrders: [{
      id: "po_1",
      lines: [{ partId: "part_1", quantity: 1, unitCostCents: 5500 }],
      location: { name: "Time Motor Sales" },
      locationId: "loc_1",
      orderedTotalCents: 5500,
      purchaseOrderNumber: "PO-1001",
      status: "ACKNOWLEDGED",
      vendor: { name: "NAPA" }
    }],
    receipts: [],
    recoveries: [],
    requisitions: [],
    transfers: []
  },
  waveOne: {
    counts: [],
    discrepancies: [],
    parts: [{ id: "part_1", partNumber: "PAD-100", description: "Front brake pads", standardCostCents: 5500, balances: [] }],
    recommendations: [],
    reservations: [],
    stockLocations: [{ id: "stock_1", code: "RO-BIN", name: "RO Bin Shelf", locationId: "loc_1", location: { name: "Time Motor Sales" } }]
  }
} as unknown as Model;

describe("PartsReceivingWorkspace", () => {
  it("renders a simplified front-desk receiving workflow", () => {
    const html = renderToStaticMarkup(<PartsReceivingWorkspace initial={model} />);

    expect(html).toContain("Receive Parts");
    expect(html).toContain("Find the delivery");
    expect(html).toContain("purchase order number from the packing slip");
    expect(html).toContain("Confirm what arrived");
    expect(html).toContain("Print or apply the RO bin/location label");
    expect(html).toContain("Label preview");
    expect(html).toContain("Location label");
    expect(html).toContain("Complete Receiving");
    expect(html).toContain("PO-1001");
    expect(html).toContain("Back to My Workspace");
  });
});
