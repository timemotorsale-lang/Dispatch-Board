import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ServiceClosePartsWorkspace } from "@/features/inventory/service-close-parts-workspace";

const initial = {
  custodyEvents: [],
  demands: [],
  discrepancies: [],
  interchanges: [],
  locations: [{ id: "loc-1", name: "Main Store" }],
  offers: [],
  parts: [],
  purchaseOrders: [],
  receipts: [],
  recoveries: [],
  repairOrders: [{
    closedAt: null,
    customer: null,
    id: "ro-1",
    invoicePackages: [],
    locationId: "loc-1",
    repairOrderNumber: "RO-DB21B235",
    stage: "REPAIR",
    vehicle: { color: "White", make: "Toyota", model: "RAV4", stockNumber: "333586", vehicleNumber: "VEH-436ED525", vin: "2T3W1RFVXRW333586", year: 2024 },
  }],
  requisitions: [],
  stockLocations: [{ code: "BIN-1", id: "stock-1", name: "Main Bin" }],
  transfers: [],
  vendors: [{ id: "vendor-1", name: "Diego Auto Body" }],
};

describe("ServiceClosePartsWorkspace", () => {
  it("renders a simple bulk needed-parts entry and explicit ordering/use controls", () => {
    const html = renderToStaticMarkup(<ServiceClosePartsWorkspace initial={initial} initialRepairOrderId="ro-1" returnLabel="Return to RO-DB21B235" returnTo="/vehicles/repair-workbench?repairOrderId=ro-1" />);

    expect(html).toContain("Add needed parts");
    expect(html).toContain("2024 Toyota RAV4");
    expect(html).toContain("Stock 333586");
    expect(html).toContain("VIN 2T3W1RFVXRW333586");
    expect(html).toContain("Write the note the way you received the information.");
    expect(html).toContain("aria-label=\"Bold\"");
    expect(html).toContain("aria-label=\"Italic\"");
    expect(html).toContain("aria-label=\"Underline\"");
    expect(html).toContain("Bullet");
    expect(html).toContain("Number");
    expect(html).not.toContain("Load 2024 RAV4 collision list");
    expect(html).toContain("Ordered");
    expect(html).toContain("Used");
    expect(html).toContain("Returns");
  });
});
