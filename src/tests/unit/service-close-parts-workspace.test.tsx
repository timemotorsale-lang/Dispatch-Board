import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
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
    origin: "INVENTORY_RECON",
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
  it("uses customer procurement even when a customer vehicle has a historic inventory link", () => {
    const html = renderToStaticMarkup(<ServiceClosePartsWorkspace initial={{
      ...initial,
      repairOrders: [{ ...initial.repairOrders[0], origin: "CUSTOMER_REPAIR", customer: { displayName: "Amin Sadiki" } }],
    }} initialRepairOrderId="ro-1" />);
    expect(html).toContain('aria-label="Customer vehicle parts purchases"');
    expect(html).toContain("Amin Sadiki");
    expect(html).toContain("Customer pricing stays on the approved estimate.");
    expect(html).toContain("$450.00");
    expect(html).not.toContain('aria-label="Recon budget guardrail"');
    expect(html).not.toContain("Review recon budget");
    expect(html).not.toContain("Manager approval required");
  });

  it("does not invent a zero recon ceiling from the vehicle age or value", () => {
    const html = renderToStaticMarkup(<ServiceClosePartsWorkspace initial={{
      ...initial,
      repairOrders: [{ ...initial.repairOrders[0], inventoryUnit: { id: "inv-1" } }],
    }} initialRepairOrderId="ro-1" />);
    expect(html).toContain("Recon budget not set");
    expect(html).toContain("Set recon budget");
    expect(html).toContain("Not set");
    expect(html).not.toContain("target gross");
    expect(html).not.toContain("Manager approval required");
  });

  it("retains closed purchase costs and excludes cancelled purchase orders", () => {
    const html = renderToStaticMarkup(<ServiceClosePartsWorkspace initial={{
      ...initial,
      purchaseOrders: [
        { ...initial.purchaseOrders[0], status: "CLOSED", orderedTotalCents: 180000 },
        { ...initial.purchaseOrders[0], id: "cancelled", status: "CANCELLED", orderedTotalCents: 999999 },
      ],
    }} initialRepairOrderId="ro-1" />);
    expect(html).toContain("$1800.00");
    expect(html).toContain("This vehicle needs approval for $9.98");
  });

  it("opens active outside-vendor parts work directly into delivery and repair-progress controls", () => {
    const html = renderToStaticMarkup(<ServiceClosePartsWorkspace initial={initial} initialRepairOrderId="ro-1" returnLabel="Return to RO-DB21B235" returnTo="/vehicles/repair-workbench?repairOrderId=ro-1" />);

    expect(html).toContain("2024 Toyota RAV4");
    expect(html).toContain("Stock 333586");
    expect(html).toContain("VIN 2T3W1RFVXRW333586");
    expect(html).not.toContain("Load 2024 RAV4 collision list");
    expect(html).toContain("Bought / Ordered");
    expect(html).toContain("Create and track purchases");
    expect(html).toContain("Other parts actions");
    expect(html).not.toContain("GM approve / deny");
    expect(html).toContain("Saved for this repair order");
    expect(html).toContain("Only records linked to RO-DB21B235 are shown.");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("What happens next");
    expect(html).toContain("Return to RO-DB21B235");
    expect(html).toContain("Coordinate delivery to Gil Tires");
    expect(html).toContain("Plan pickup &amp; delivery");
    expect(html).toContain("Next move");
    expect(html).toContain("Document repair progress");
    expect(html).toContain("Next simple step");
    expect(html).toContain("Repair complete");
    expect(html).toContain("Save next move");
    expect(html).toContain("Used");
    expect(html).toContain("Returns");
    expect(html).toContain("Approve");
    expect(html).not.toContain("Request approval");
  });

  it("turns a vendor-ready repair into a simple return-to-dealership step", () => {
    const html = renderToStaticMarkup(<ServiceClosePartsWorkspace initial={{
      ...initial,
      repairOrders: [{
        ...initial.repairOrders[0],
        vendorWorks: [{ ...initial.repairOrders[0].vendorWorks[0], status: "READY_FOR_PICKUP" }],
      }],
    }} initialRepairOrderId="ro-1" />);

    expect(html).toContain("Repair complete. Bring it back.");
    expect(html).toContain("Repair is complete at the vendor. Bring the vehicle back to the dealership for QC.");
    expect(html).toContain("Start pickup back");
    expect(html).toContain("Back: start QC");
    expect(html).not.toContain("Repairing at vendor");
  });

  it("offers QC as the next move once return transport is underway", () => {
    const html = renderToStaticMarkup(<ServiceClosePartsWorkspace initial={{
      ...initial,
      repairOrders: [{
        ...initial.repairOrders[0],
        vendorWorks: [{ ...initial.repairOrders[0].vendorWorks[0], status: "RETURN_TRANSPORT" }],
      }],
    }} initialRepairOrderId="ro-1" />);

    expect(html).toContain("Back from vendor? Start QC.");
    expect(html).toContain("Pickup is already moving. When it arrives, send it straight to dealership QC.");
    expect(html).toContain("Back: start QC");
    expect(html).not.toContain("Coordinate pickup and delivery");
  });

  it("shows simple QC pass, fail, and handoff choices at the QC stage", () => {
    const html = renderToStaticMarkup(<ServiceClosePartsWorkspace initial={{
      ...initial,
      repairOrders: [{
        ...initial.repairOrders[0],
        vendorWorks: [{ ...initial.repairOrders[0].vendorWorks[0], status: "QC_REQUIRED" }],
      }],
    }} initialRepairOrderId="ro-1" />);

    expect(html).toContain("QC decision: pass or fail.");
    expect(html).toContain("Record the QC result. Pass moves to handoff. Fail sends it back to a repair decision.");
    expect(html).toContain("QC passed: handoff");
    expect(html).toContain("QC failed");
    expect(html).not.toContain("Coordinate pickup and delivery");
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
