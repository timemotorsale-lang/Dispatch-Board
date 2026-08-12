import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";

describe("Shop Planning diagnostic release workspace", () => {
  it("keeps the repair order, diagnostic mission, evidence ledger, and governed stages together", () => {
    const order = {
      id: "ro-1", repairOrderNumber: "RO-100", version: 1, stage: "INTAKE", updatedAt: "2026-08-01T15:00:00.000Z",
      vehicle: { id: "vehicle-1", vehicleNumber: "VEH-1", vin: "VIN123", year: 2024, make: "Toyota", model: "RAV4" },
      customer: { displayName: "Leo James" }, inventoryUnit: null,
      serviceVisit: { arrivedAt: "2026-08-01T14:00:00.000Z", concernSummary: "Customer reports grinding from the front passenger brake." },
      advisorUpdates: [],
      vendorWorks: [],
      inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], repairJobs: [], partDemands: [],
    };
    const markup = renderToStaticMarkup(<ShopPlanningWorkspace initial={{ repairOrders: [order], users: [{ id: "tech-1", name: "Walter Mechanic" }] }} returnTo="/vehicles/repair-workbench?repairOrderId=ro-1" />);
    expect(markup).toContain("Repair Planning Command Center");
    expect(markup).toContain("Vehicle released for diagnosis");
    expect(markup).toContain("Diagnostic mission");
    expect(markup).toContain("Diagnostic repair");
    expect(markup).toContain("Body / collision scope");
    expect(markup).toContain("Outside vendor");
    expect(markup).toContain("Send to outside vendor");
    expect(markup).toContain("Deploy vendor workflow");
    expect(markup).toContain("Evidence ledger");
    expect(markup).toContain("Exact-version customer authorization required");
    expect(markup).toContain("Return to workbench");
    expect(markup).toContain("Simple inspection entry");
    expect(markup).toContain("What did you inspect?");
    expect(markup).toContain("Proof / evidence");
    expect(markup).toContain("Advanced details");
  });

  it("defaults visible bodywork to the direct repair scope path", () => {
    const order = {
      id: "ro-2", repairOrderNumber: "RO-200", version: 1, stage: "INTAKE", updatedAt: "2026-08-01T15:00:00.000Z",
      vehicle: { id: "vehicle-2", vehicleNumber: "VEH-2", vin: "VIN456", year: 2024, make: "Toyota", model: "RAV4" },
      customer: null, inventoryUnit: { acquisitionAppraisals: [{ estimatedReconCents: 325000, estimatedRetailCents: 2100000 }], acquisitionCase: { appraisalSnapshot: { estimatedReconCents: 325000, expectedRetailCents: 2100000 }, recommendationSnapshot: {} }, costEntries: [{ amountCents: 90000, category: "RECON", currency: "USD", recoveredAt: null, status: "POSTED" }], id: "inv-1", inventoryNumber: "333586", lifecycleStage: "RECONDITIONING", nextAction: "Approve recon scope.", operatingState: "ACTIVE", ownerUser: { id: "owner-1", name: "Morgan Inventory" }, stateReason: null, targetAt: "2026-08-03T14:00:00.000Z", version: 4 },
      serviceVisit: { arrivedAt: "2026-08-01T14:00:00.000Z", concernSummary: "Auction bodywork damage to bumper and fender." },
      advisorUpdates: [],
      vendorWorks: [],
      inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], repairJobs: [], partDemands: [],
    };
    const markup = renderToStaticMarkup(<ShopPlanningWorkspace initial={{ repairOrders: [order], users: [{ id: "tech-1", name: "Walter Mechanic" }] }} returnTo="/vehicles/repair-workbench?repairOrderId=ro-2" />);
    expect(markup).toContain("Direct repair mission");
    expect(markup).toContain("Vehicle ready for direct repair scope");
    expect(markup).toContain("No-diagnosis path");
    expect(markup).toContain("Why diagnosis is not required");
    expect(markup).toContain("Record direct repair scope");
    expect(markup).toContain("TAI recon budget guardrail");
    expect(markup).toContain("Rapid recon estimate recipe");
  });

  it("shows when an approved line already has a repair job instead of encouraging a duplicate create", () => {
    const order = {
      id: "ro-3", repairOrderNumber: "RO-300", version: 7, stage: "READY_FOR_REPAIR", updatedAt: "2026-08-01T15:00:00.000Z",
      vehicle: { id: "vehicle-3", vehicleNumber: "VEH-3", vin: "VIN789", year: 2018, make: "Honda", model: "CR-V" },
      customer: null, inventoryUnit: null,
      serviceVisit: { arrivedAt: "2026-08-01T14:00:00.000Z", concernSummary: "Visible bodywork damage already approved." },
      advisorUpdates: [{ id: "update-1", version: 1, statusCode: "READY_FOR_QC", promiseAt: null, contactChannel: "INTERNAL", contactDirection: "INTERNAL", contactOutcome: "Repair complete and ready for QC", customerVisibleSummary: "Repair is complete and needs a final quality check before handoff.", internalNotes: "Next action: open QC workspace.", nextContactAt: null, occurredAt: "2026-08-01T15:30:00.000Z", authorUser: { name: "Alex Carter" } }],
      vendorWorks: [],
      inspectionVersions: [{ id: "insp-1", version: 1, summary: "done", completedAt: "2026-08-01T14:30:00.000Z" }],
      diagnosisVersions: [{ id: "diag-1", version: 1, cause: "Direct repair scope approved without troubleshooting diagnosis.", proposedCorrection: "Repair body damage", uncertainty: "LOW", technicianUser: { name: "Walter Mechanic" } }],
      estimateVersions: [{ id: "est-1", version: 1, status: "PRESENTED", totalCents: 125000, expiresAt: "2026-08-02T15:00:00.000Z", lineItems: [{ key: "LINE-1", type: "LABOR", description: "Body labor", quantity: 1, unitPriceCents: 125000, taxable: false, workTypeCode: "BODY", laborGuideMinutes: 120, plannedCorrection: "Body repair" }], authorizations: [{ id: "auth-1", disposition: "ACCEPTED", authorizedLineKeys: ["LINE-1"], authorizedAmountCents: 125000, decisionActorName: "Manager" }] }],
      repairJobs: [{ id: "job-1", jobNumber: "J001", authorizedLineKey: "LINE-1", description: "Body labor", status: "READY_FOR_REPAIR", readinessReasonCodes: ["JOB_AUTHORIZATION_VALID", "JOB_PARTS_READY"], partDemands: [] }],
      partDemands: [],
    };
    const markup = renderToStaticMarkup(<ShopPlanningWorkspace initial={{ repairOrders: [order], users: [{ id: "tech-1", name: "Walter Mechanic" }] }} returnTo="/vehicles/repair-workbench?repairOrderId=ro-3" />);
    expect(markup).toContain("Repair job already created");
    expect(markup).toContain("Repair jobs already created");
    expect(markup).toContain("already carrying this approved work");
    expect(markup).toContain("J001");
    expect(markup).toContain("Live repair progress");
    expect(markup).toContain("Recent repair updates");
    expect(markup).toContain("Repair is ready for QC");
    expect(markup).toContain("Open QC workspace");
  });

  it("turns an active vendor record into the outside vendor workflow path", () => {
    const order = {
      id: "ro-4", repairOrderNumber: "RO-400", version: 3, stage: "AUTHORIZATION", updatedAt: "2026-08-01T15:00:00.000Z",
      vehicle: { id: "vehicle-4", vehicleNumber: "VEH-4", vin: "VIN999", year: 2020, make: "Honda", model: "Accord" },
      customer: null, inventoryUnit: null,
      serviceVisit: { arrivedAt: "2026-08-01T14:00:00.000Z", concernSummary: "Check engine lights and bumper damage need outside help." },
      advisorUpdates: [],
      vendorWorks: [{
        approvalStatus: "NEEDS_DOCUMENTATION",
        currentLocation: "Northside Garage",
        expectedReturnAt: "2026-08-04T15:00:00.000Z",
        id: "vendor-1",
        lastUpdateSummary: "Vendor has vehicle and is preparing estimate.",
        nextAction: "Confirm estimate, parts demand, and expected return.",
        scope: "Inspect warning lights, front bumper, and airbag concern.",
        status: "AT_VENDOR",
        vendorName: "Northside Garage",
      }],
      inspectionVersions: [{ id: "insp-4", version: 1, summary: "sent out", completedAt: "2026-08-01T14:30:00.000Z" }],
      diagnosisVersions: [], estimateVersions: [], repairJobs: [], partDemands: [],
    };
    const markup = renderToStaticMarkup(<ShopPlanningWorkspace initial={{ repairOrders: [order], users: [{ id: "tech-1", name: "Walter Mechanic" }] }} returnTo="/vehicles/repair-workbench?repairOrderId=ro-4" />);
    expect(markup).toContain("Outside vendor mission");
    expect(markup).toContain("Vehicle ready for outside vendor route");
    expect(markup).toContain("Vendor workflow active");
    expect(markup).toContain("Northside Garage");
    expect(markup).toContain("Did the vendor receive it?");
    expect(markup).toContain("What are they fixing?");
    expect(markup).toContain("Do they need parts?");
    expect(markup).toContain("Was it fixed?");
    expect(markup).toContain("What happens after completion?");
    expect(markup).toContain("Outside vendor active");
    expect(markup).toContain("Staff-entered vendor workbench");
    expect(markup).toContain("Staff-entered vendor approval");
    expect(markup).toContain("Correct vendor scope");
    expect(markup).toContain("Vendor lifecycle status");
    expect(markup).toContain("Save vendor update");
    expect(markup).toContain("Ready pickup");
    expect(markup).toContain("Complete vendor work");
    expect(markup).toContain("Approve and move to repair");
    expect(markup).toContain("Vendor repair, return, and QC handoff");
    expect(markup).toContain("Was the vehicle repaired?");
    expect(markup).toContain("Vendor repaired — plan pickup");
    expect(markup).toContain("Pickup / transport started");
    expect(markup).toContain("Vendor failed — bring back");
    expect(markup).toContain("Vehicle returned");
    expect(markup).toContain("Send to QC / decision");
    expect(markup).toContain("Needs repair decision");
    expect(markup).toContain("QC failed — return to vendor");
    expect(markup).toContain("Complete after QC");
  });
});
