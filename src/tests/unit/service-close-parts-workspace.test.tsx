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
  parts: [{ description: "Transmission assembly", id: "part-1", partNumber: "TRANS-ASM", standardCostCents: 45000 }],
  purchaseOrders: [{ id: "po-1", lines: [{ partId: "part-1", quantity: 1, unitCostCents: 45000 }], locationId: "loc-1", orderedTotalCents: 45000, purchaseOrderNumber: "PO-1001", requisition: { demand: { repairOrder: { id: "ro-1", repairOrderNumber: "RO-DB21B235" } } }, status: "DRAFT", vendorId: "vendor-1", vendor: { name: "Diego Auto Body" } }],
  receipts: [],
  recoveries: [],
  repairOrders: [{
    closedAt: null,
    customer: null,
    id: "ro-1",
    inventoryUnit: {
      acquisitionAppraisals: [{ estimatedReconCents: 179002, estimatedRetailCents: 1995840 }],
      acquisitionCase: { appraisalSnapshot: { estimatedReconCents: 179002, expectedRetailCents: 1995840 } },
      id: "inv-1",
      inventoryNumber: "098317",
    },
    invoicePackages: [],
    locationId: "loc-1",
    repairOrderNumber: "RO-DB21B235",
    stage: "REPAIR",
    repairJobs: [{ id: "job-1", jobNumber: "J-1" }],
    vendorWorks: [{ approvalStatus: "APPROVED", approvedAmountCents: 45000, currentLocation: "Gil Tires", directFromSource: true, estimateAmountCents: 45000, expectedReturnAt: null, id: "vw-1", keysCustodian: "Gil Tires", nextFollowUpAt: null, scope: "Install used engine", sentFrom: "Auction", status: "AT_VENDOR", supplementalAmountCents: null, transportMethod: "Tow", vendorName: "Gil Tires" }],
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
    expect(html).toContain("No needed parts are blocking this repair order.");
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
    expect(html).toContain("Bought / Ordered");
    expect(html).toContain("Create and track purchases");
    expect(html).toContain("Other parts actions");
    expect(html).not.toContain("GM approve / deny");
    expect(html).toContain("Saved for this repair order");
    expect(html).toContain("Only records linked to RO-DB21B235 are shown.");
    expect(html).toContain("Enter at least one part before saving.");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("What happens next");
    expect(html).toContain("Return to RO-DB21B235");
    expect(html).toContain("Coordinate delivery to Gil Tires");
    expect(html).toContain("Plan pickup &amp; delivery");
    expect(html).toContain("Used");
    expect(html).toContain("Returns");
    expect(html).toContain("Approve");
    expect(html).not.toContain("Request approval");
  });

  it("shows a manager budget-exception path when committed spend is over the recon ceiling", () => {
    const html = renderToStaticMarkup(<ServiceClosePartsWorkspace initial={{
      ...initial,
      purchaseOrders: [{
        id: "po-1",
        locationId: "loc-1",
        orderedTotalCents: 181700,
        purchaseOrderNumber: "PO-2001",
        requisition: { demand: { repairOrder: { id: "ro-1", repairOrderNumber: "RO-DB21B235" } } },
        status: "APPROVED",
        vendorId: "vendor-1",
        vendor: { name: "Northside Garage" }
      }],
    }} initialRepairOrderId="ro-1" />);

    expect(html).toContain("Manager approval required");
    expect(html).toContain("This vehicle needs approval for $26.98 before another purchase.");
    expect(html).toContain("Review this overage");
    expect(html).toContain("Return to previous work");
  });

  it("does not carry purchase, receipt, or budget data from another repair order", () => {
    const otherOrder = { ...initial.repairOrders[0], id: "ro-2", repairOrderNumber: "RO-OTHER", vehicle: { ...initial.repairOrders[0].vehicle, model: "Camry", vehicleNumber: "VEH-OTHER" } };
    const html = renderToStaticMarkup(<ServiceClosePartsWorkspace initial={{
      ...initial,
      purchaseOrders: [{ ...initial.purchaseOrders[0], orderedTotalCents: 999999, purchaseOrderNumber: "PO-OTHER", requisition: { demand: { repairOrder: { id: "ro-2", repairOrderNumber: "RO-OTHER" } } } }],
      repairOrders: [initial.repairOrders[0], otherOrder],
    }} initialRepairOrderId="ro-1" />);

    expect(html).not.toContain("PO-OTHER");
    expect(html).toContain("Spend room available");
    expect(html).not.toContain("Manager approval required");
    expect(html).toContain("Only records linked to RO-DB21B235 are shown.");
  });
});
