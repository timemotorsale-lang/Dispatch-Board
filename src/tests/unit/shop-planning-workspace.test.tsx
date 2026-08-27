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
    expect(markup).toContain("Diagnostic / mechanical");
    expect(markup).toContain("Select the repair type now");
    expect(markup).toContain("Bodywork repair");
    expect(markup).toContain("Outside vendor");
    expect(markup).toContain("Send to outside vendor");
    expect(markup).toContain("Deploy vendor workflow");
    expect(markup).toContain("Simple estimate lines");
    expect(markup).toContain("Quick search for a common repair area");
    expect(markup).toContain("Use recorded correction");
    expect(markup).toContain("Description (required)");
    expect(markup).toContain("Expires (required)");
    expect(markup).toContain("Open full Labor Guide");
    expect(markup).toContain("Evidence ledger");
    expect(markup).toContain("Exact-version customer authorization required");
    expect(markup).toContain("Return to summary card");
    expect(markup).toContain('href="/vehicles/repair-workbench?repairOrderId=ro-1&amp;vehicleId=vehicle-1"');
    expect(markup).toContain("Return to source workbench");
    expect(markup).toContain("Simple inspection entry");
    expect(markup).toContain("What did you inspect?");
    expect(markup).toContain("Proof / evidence");
    expect(markup).toContain("Advanced details");
    expect(markup).toContain("No approved repair line is available to release yet");
    expect(markup).toContain("Create estimate first");
    expect(markup).not.toContain("Add line to release");
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
    expect(markup).toContain("Bodywork repair mission");
    expect(markup).toContain("Vehicle selected for bodywork repair");
    expect(markup).toContain("Bodywork repair path");
    expect(markup).toContain("Why diagnosis is not required");
    expect(markup).toContain("Save bodywork repair scope");
    expect(markup).toContain("Direct repair summary (required)");
    expect(markup).toContain("Prepare a bodywork repair estimate from the documented visible damage.");
    expect(markup).toContain("Repair the documented bodywork damage, then verify panel fit, finish, and repair quality.");
    expect(markup).toContain("TAI recon budget guardrail");
    expect(markup).toContain("Rapid recon estimate recipe");
    expect(markup).toContain("Create/open repair job");
    expect(markup).toContain("Body / collision labor");
    expect(markup).toContain("Teardown / supplement check");
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
    expect(markup).toContain("What happened? (required)");
    expect(markup).toContain("Save update");
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
    expect(markup).toContain("Outside vendor progress");
    expect(markup).toContain("Waiting for vendor estimate");
    expect(markup).toContain("Vendor record");
    expect(markup).toContain("Dealership QC happens after return");
    expect(markup).not.toContain("Inspection evidence required");
    expect(markup).not.toContain("Repair cannot start from intake alone");
    expect(markup).toContain("Vehicle ready for outside vendor route");
    expect(markup).toContain("What staff should do now");
    expect(markup).toContain("Record the vendor estimate");
    expect(markup).toContain("Open vendor estimate");
    expect(markup).toContain("Simple vendor estimate path");
    expect(markup).toContain("the saved vendor record is the evidence");
    expect(markup).toContain("You do not need to create an internal diagnosis");
    expect(markup).toContain('id="repair-planning-step-3" open=""');
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

  it("routes returned vendor work directly into dealership QC for pass or fail", () => {
    const order = {
      id: "ro-vendor-qc", repairOrderNumber: "RO-500", version: 9, stage: "QUALITY_CONTROL", updatedAt: "2026-08-25T12:00:00.000Z",
      vehicle: { id: "vehicle-5", vehicleNumber: "VEH-5", vin: "VIN500", year: 2019, make: "Hyundai", model: "Elantra" },
      customer: { displayName: "Nimo Ibrahim" }, inventoryUnit: null,
      serviceVisit: { arrivedAt: "2026-08-24T21:06:00.000Z", concernSummary: "Outer door handle and steering column covers need completion after vendor return." },
      advisorUpdates: [],
      vendorWorks: [{
        approvalStatus: "APPROVED",
        currentLocation: "Time Motor Sales - Minneapolis",
        expectedReturnAt: "2026-08-25T12:00:00.000Z",
        id: "vendor-qc-1",
        lastUpdateSummary: "Returned from Simba Collision for dealership QC.",
        nextAction: "Inspect returned work and decide pass or follow-up repair.",
        scope: "Replace outer door handle and upper/lower steering column covers.",
        status: "QC_REQUIRED",
        vendorName: "Simba Collision",
      }],
      inspectionVersions: [{ id: "insp-5", version: 1, summary: "sent out", completedAt: "2026-08-24T21:30:00.000Z" }],
      diagnosisVersions: [], estimateVersions: [], repairJobs: [], partDemands: [],
    };

    const markup = renderToStaticMarkup(<ShopPlanningWorkspace initial={{ repairOrders: [order], users: [{ id: "tech-1", name: "Walter Mechanic" }] }} returnTo="/vehicles/repair-workbench?repairOrderId=ro-vendor-qc" vendorFollowUp />);

    expect(markup).toContain("Create same-RO completion work");
    expect(markup).toContain("Create internal follow-up scope");
    expect(markup).toContain("Same-RO completion work");
    expect(markup).toContain("Create the internal follow-up job here, not a separate unrelated RO");
    expect(markup).toContain("Create internal completion scope");
    expect(markup).toContain("Use diagnostic path instead");
    expect(markup).toContain("Completion estimate");
    expect(markup).toContain("Turn the failed vendor QC items into an approved line");
    expect(markup).toContain("Create/open completion job");
    expect(markup).toContain("Approval needed before repair job");
    expect(markup).toContain("The approved decision and approved repair line dropdowns are hidden");
    expect(markup).toContain("Create completion estimate first");
    expect(markup).not.toContain("Add line to release");
    expect(markup).not.toContain("Open return and QC");
  });

  it("does not show the repair release controls when no approved line exists", () => {
    const order = {
      id: "ro-no-approval", repairOrderNumber: "RO-600", version: 5, stage: "READY_FOR_REPAIR", updatedAt: "2026-08-25T12:00:00.000Z",
      vehicle: { id: "vehicle-6", vehicleNumber: "VEH-6", vin: "VIN600", year: 2019, make: "Hyundai", model: "Elantra" },
      customer: null, inventoryUnit: null,
      serviceVisit: { arrivedAt: "2026-08-24T21:06:00.000Z", concernSummary: "Repair outer door handle and steering column covers." },
      advisorUpdates: [],
      vendorWorks: [],
      inspectionVersions: [{ id: "insp-6", version: 1, summary: "inspected", completedAt: "2026-08-24T21:30:00.000Z" }],
      diagnosisVersions: [{ id: "diag-6", version: 1, cause: "Direct repair scope approved without troubleshooting diagnosis.", proposedCorrection: "Repair outer door handle and steering column covers.", uncertainty: "LOW", technicianUser: { name: "Walter Mechanic" } }],
      estimateVersions: [], repairJobs: [], partDemands: [],
    };

    const markup = renderToStaticMarkup(<ShopPlanningWorkspace initial={{ repairOrders: [order], users: [{ id: "tech-1", name: "Walter Mechanic" }] }} returnTo="/vehicles/repair-workbench?repairOrderId=ro-no-approval" />);

    expect(markup).toContain("Create the repair estimate");
    expect(markup).toContain("No approved repair line is available to release yet");
    expect(markup).toContain("The approved decision and approved repair line dropdowns are hidden");
    expect(markup).toContain("Create/open repair job");
    expect(markup).toContain("Create estimate first");
    expect(markup).not.toContain("Flexible repair release");
    expect(markup).not.toContain("Approved decision");
    expect(markup).not.toContain("Approved repair line");
    expect(markup).not.toContain("Add line to release");
  });
});
